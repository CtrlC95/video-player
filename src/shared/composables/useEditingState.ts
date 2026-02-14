import { computed, ref } from 'vue'
import { parseTagList, sanitizeFilePart, stripExtension } from '../utils/editingUtils'

export const songBpmStatus = ref<'idle' | 'loading' | 'error'>('idle')
export const songBpm = ref<number | null>(null)
export const ranges = ref<Array<{ id: string; tag: string; start: number; end: number }>>([])
export const duration = ref(0)
export const currentTime = ref(0)
export const segmentLength = ref(15)
export const selectedSongFile = ref<File | null>(null)
export const exportDirectoryPath = ref('')
export const selectedFilePath = ref('')
export const renderMessage = ref('')
export const exportPath = ref('')
export const selectedFileName = ref('')
export const videoGirlTag = ref('')
export const videoUrl = ref('')

export const canRender = computed(() =>
  Boolean(canEditRanges.value && ranges.value.length && renderFolderName.value)
)
export const renderFolderName = computed(() => {
  if (!selectedFileName.value) return ''
  const baseName = sanitizeFilePart(stripExtension(selectedFileName.value))
  const tags = parseTagList(videoGirlTag.value)
    .map((tag) => sanitizeFilePart(tag))
    .filter(Boolean)
  if (!tags.length) return baseName
  return `[${tags.join(', ')}] ${baseName}`
})
export const canEditRanges = computed(
  () => Boolean(selectedFilePath.value) && Boolean(exportDirectoryPath.value)
)
