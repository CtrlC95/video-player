import { ref } from 'vue'

export interface FileItem {
  name: string
  isDirectory: boolean
  fullPath: string
  handle?: any
}

export const VIDEO_EXTENSIONS = [
  '.mp4',
  '.avi',
  '.mov',
  '.mkv',
  '.flv',
  '.webm',
  '.m4v',
  '.wmv',
  '.3gp',
  '.ogv',
  '.ts',
  '.m2ts',
  '.mts',
  '.vob',
]

function createBrowserState(filterExtensions?: string[]) {
  const currentPath = ref<string>('')
  const files = ref<FileItem[]>([])
  const directoryHandle = ref<any>(null)
  const fullDirectoryPath = ref<string>('')

  async function loadFromHandle(dirHandle: any) {
    const fileList: FileItem[] = []
    for await (const entry of dirHandle.values()) {
      if (filterExtensions && entry.kind === 'file') {
        // Filter by file extension
        const ext = entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase()
        if (filterExtensions.includes(ext)) {
          fileList.push({
            name: entry.name,
            isDirectory: false,
            fullPath: entry.name,
            handle: entry,
          })
        }
      } else if (!filterExtensions) {
        // No filter, include all
        if (entry.kind === 'file') {
          fileList.push({
            name: entry.name,
            isDirectory: false,
            fullPath: entry.name,
            handle: entry,
          })
        } else {
          fileList.push({
            name: entry.name,
            isDirectory: true,
            fullPath: entry.name,
            handle: entry,
          })
        }
      }
    }

    // Sort: directories first (if included), then alphabetically
    files.value = fileList.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return b.isDirectory ? 1 : -1
      }
      return a.name.localeCompare(b.name)
    })
  }

  async function selectDirectory() {
    try {
      const dirHandle = await (window as any).showDirectoryPicker()
      directoryHandle.value = dirHandle
      currentPath.value = dirHandle.name
      console.log('Selected directory handle:', dirHandle)
      console.log('Stored currentPath:', currentPath.value)
      await loadFromHandle(dirHandle)
    } catch (err) {
      console.error('Error selecting directory:', err)
    }
  }

  return {
    currentPath,
    files,
    selectDirectory,
    directoryHandle,
    fullDirectoryPath,
  }
}

const sharedVideoBrowserState = createBrowserState(VIDEO_EXTENSIONS)

export function useFileBrowser(filterExtensions?: string[]) {
  return createBrowserState(filterExtensions)
}

export function useVideoFileBrowser() {
  return sharedVideoBrowserState
}
