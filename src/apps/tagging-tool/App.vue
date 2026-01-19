<template>
  <div class="tagging-tool-app" @keydown="handleKeydown">
    <aside class="sidebar">
      <div class="sidebar-content">
        <button class="btn-select" @click="handleSelectDirectory">
          {{ currentPath ? 'Change Directory' : 'Select Directory' }}
        </button>

        <select v-model="filterBy" class="filter-select">
          <option value="none">None</option>
          <option value="creator">Missing Creator</option>
          <option value="songName">Missing Song Name</option>
          <option value="artist">Missing Artist</option>
          <option value="webAddress">Missing Web Address</option>
        </select>

        <div class="video-count">
          {{ filteredFiles.length }} video{{ filteredFiles.length !== 1 ? 's' : '' }}
        </div>
      </div>

      <div v-if="filteredFiles.length > 0" class="file-list">
        <div
          v-for="file in filteredFiles"
          :key="file.name"
          class="file-item"
          :class="{
            selected: selectedFile?.name === file.name,
            'not-in-database': !isFileInDatabase(file.name),
          }"
          @click="selectFile(file)"
        >
          <span class="file-icon">{{ file.isDirectory ? '📁' : '📄' }}</span>
          <span class="file-name">{{ file.name }}</span>
        </div>
      </div>

      <div v-else-if="currentPath" class="empty-state-sidebar">
        <p>No untagged videos found</p>
      </div>
    </aside>

    <main class="main-content">
      <div v-if="!selectedFile" class="empty-state">
        <p>{{ currentPath ? 'Select a video to tag' : 'Select a directory to browse' }}</p>
      </div>

      <div v-else class="player-wrapper">
        <video
          v-if="videoUrl"
          ref="videoPlayer"
          :src="videoUrl"
          controls
          class="video-player"
        ></video>
        <div v-else class="video-placeholder">Loading video...</div>
      </div>
    </main>

    <aside class="right-sidebar">
      <div v-if="selectedFile" class="tagging-panel">
        <h2 class="video-title">{{ selectedFile.name }}</h2>

        <div class="form-group">
          <label>Creator</label>
          <input v-model="creator" type="text" placeholder="Creator name" />
        </div>

        <div class="form-group">
          <label>Song Name</label>
          <input v-model="songName" type="text" placeholder="Song name" />
        </div>

        <div class="form-group">
          <label>Artist</label>
          <input v-model="artist" type="text" placeholder="Artist name" />
        </div>

        <div class="form-group">
          <label>Web Address</label>
          <input v-model="webAddress" type="text" placeholder="https://..." />
        </div>

        <button class="btn-save" @click="saveTags">Save</button>

        <div v-if="saveMessage" class="save-message">{{ saveMessage }}</div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useVideoFileBrowser } from '../../shared/composables/useFileBrowser'
  import type { FileItem } from '../../shared/composables/useFileBrowser'
  import { videoDataService } from '../../shared/services/videoDataService'
  import type { VideoMetadata } from '../../shared/types/media'

  defineOptions({
    name: 'TaggingToolApp',
  })

  const { currentPath, files, selectDirectory, directoryHandle } = useVideoFileBrowser()

  const selectedFile = ref<FileItem | null>(null)
  const videoUrl = ref('')
  const creator = ref('')
  const songName = ref('')
  const artist = ref('')
  const webAddress = ref('')
  const saveMessage = ref('')
  const isInitialized = ref(false)
  const videosInDatabase = ref<VideoMetadata[]>([])
  const filterBy = ref<'none' | 'creator' | 'songName' | 'artist' | 'webAddress'>('none')

  // Filter files based on database status and selected filter
  const filteredFiles = computed(() => {
    let result = files.value.filter((file) => !isFileInDatabase(file.name))

    // If a filter is selected, show files from database with missing values instead
    if (filterBy.value !== 'none') {
      result = videosInDatabase.value
        .filter((video) => {
          if (filterBy.value === 'creator') return !video.creator
          if (filterBy.value === 'songName') return !video.songName
          if (filterBy.value === 'artist') return !video.artist
          if (filterBy.value === 'webAddress') return !video.webAddress
          return false
        })
        .map((video) => ({
          name: video.fileName,
          isDirectory: false,
          fullPath: video.fileName,
          handle: null,
        }))
    }

    return result
  })

  // Initialize videoDataService when directory is selected
  async function handleSelectDirectory() {
    await selectDirectory()
    if (directoryHandle.value) {
      await videoDataService.initialize(directoryHandle.value)
      videosInDatabase.value = await videoDataService.loadVideos()
      isInitialized.value = true
    }
  }

  function isFileInDatabase(fileName: string): boolean {
    return videosInDatabase.value.some((v) => v.fileName === fileName)
  }

  // Watch for selected file changes and load video
  watch(
    selectedFile,
    async (newFile) => {
      // Clean up old URL
      if (videoUrl.value) {
        URL.revokeObjectURL(videoUrl.value)
      }

      if (!newFile || !directoryHandle.value) {
        videoUrl.value = ''
        return
      }

      try {
        let fileHandle = newFile.handle

        // If no handle, try to get it from the directory
        if (!fileHandle) {
          fileHandle = await directoryHandle.value.getFileHandle(newFile.name)
        }

        const file = await fileHandle.getFile()
        videoUrl.value = URL.createObjectURL(file)
      } catch (error) {
        console.error('Error loading video file:', error)
        videoUrl.value = ''
      }
    },
    { immediate: false }
  )

  async function selectFile(file: FileItem) {
    selectedFile.value = file
    saveMessage.value = ''

    if (isInitialized.value) {
      // Try to load existing metadata
      const existingData = await videoDataService.getVideoByFileName(file.name)
      if (existingData) {
        creator.value = existingData.creator
        songName.value = existingData.songName
        artist.value = existingData.artist
        webAddress.value = existingData.webAddress
      } else {
        // Auto-fill from filename if it contains " - "
        parseFilename(file.name)
      }
    } else {
      // Auto-fill from filename if it contains " - "
      parseFilename(file.name)
    }
  }

  function parseFilename(filename: string) {
    // Remove file extension
    let nameWithoutExt = filename.split('.').slice(0, -1).join('.')

    // Remove PMV or PMW and everything after
    const pmvIndex = nameWithoutExt.search(/\s+(PMV|PMW)/i)
    if (pmvIndex !== -1) {
      nameWithoutExt = nameWithoutExt.substring(0, pmvIndex)
    }

    // Check if filename contains " - "
    if (nameWithoutExt.includes(' - ')) {
      const parts = nameWithoutExt.split(' - ')
      if (parts.length >= 2) {
        songName.value = parts[0].trim()
        artist.value = parts[1].trim()
        creator.value = ''
        webAddress.value = ''
      }
    } else {
      // No dash found, clear all fields
      creator.value = ''
      songName.value = ''
      artist.value = ''
      webAddress.value = ''
    }
  }

  async function saveTags() {
    if (!selectedFile.value) return

    // Get the next file BEFORE reloading the database
    const currentIndex = filteredFiles.value.findIndex((f) => f.name === selectedFile.value?.name)
    const nextFile =
      currentIndex < filteredFiles.value.length - 1 ? filteredFiles.value[currentIndex + 1] : null

    const videoData: VideoMetadata = {
      fileName: selectedFile.value.name,
      creator: creator.value,
      songName: songName.value,
      artist: artist.value,
      webAddress: webAddress.value,
      weightScore: 1,
    }

    if (isInitialized.value) {
      await videoDataService.addOrUpdateVideo(videoData)
      // Reload the database to update the list colors
      videosInDatabase.value = await videoDataService.loadVideos()
      saveMessage.value = 'Saved to videos.json!'

      // Jump to next video if available
      if (nextFile) {
        selectFile(nextFile)
      }
    } else {
      console.log('Video data:', videoData)
      saveMessage.value = 'Saved! (Check console)'
    }

    setTimeout(() => {
      saveMessage.value = ''
    }, 3000)
  }

  function handleKeydown(event: KeyboardEvent) {
    // Arrow up - previous file
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const currentIndex = filteredFiles.value.findIndex((f) => f.name === selectedFile.value?.name)
      if (currentIndex > 0) {
        selectFile(filteredFiles.value[currentIndex - 1])
      }
    }
    // Arrow down - next file
    else if (event.key === 'ArrowDown') {
      event.preventDefault()
      const currentIndex = filteredFiles.value.findIndex((f) => f.name === selectedFile.value?.name)
      if (currentIndex < filteredFiles.value.length - 1) {
        selectFile(filteredFiles.value[currentIndex + 1])
      }
    }
    // Enter - save
    else if (event.key === 'Enter') {
      event.preventDefault()
      saveTags()
    }
  }
</script>

<style scoped>
  .tagging-tool-app {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
  }

  .sidebar {
    width: 250px;
    padding-top: 50px;
    background: #494949;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .btn-select {
    padding: 0.75rem 1rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 600;
    transition: background 0.2s ease;
  }

  .btn-select:hover {
    background: #5568d3;
  }

  .filter-select {
    width: 100%;
    padding: 0.75rem;
    background: #ffffff;
    color: #333;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 0.95rem;
    cursor: pointer;
  }

  .filter-select:focus {
    outline: none;
    border-color: #667eea;
  }

  .video-count {
    padding: 0.5rem 0.75rem;
    color: #999;
    font-size: 0.85rem;
    text-align: center;
  }

  .main-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: transparent;
  }

  .player-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .video-player {
    width: 100%;
    aspect-ratio: 16 / 9;
    border: 2px solid #667eea;
    border-radius: 4px;
    background: #000;
  }

  .video-placeholder {
    width: 100%;
    aspect-ratio: 16 / 9;
    border: 2px solid #667eea;
    border-radius: 4px;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
  }

  .right-sidebar {
    width: 300px;
    padding-top: 50px;
    flex: 0 0 300px;
    background: #494949;
    border-left: 1px solid #e0e0e0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .tagging-panel {
    padding: 1.5rem;
    box-sizing: border-box;
  }

  .video-title {
    margin: 0 0 1.5rem 0;
    color: #333;
    font-size: 1.5rem;
    word-break: break-word;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .file-list {
    flex: 1;
    overflow-y: auto;
    border-top: 1px solid #e0e0e0;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .file-list::-webkit-scrollbar {
    display: none;
  }

  .file-item {
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .file-item:hover {
    background: #e8e9ea;
  }

  .file-item.selected {
    background: #667eea;
    color: white;
  }

  .file-icon {
    font-size: 1rem;
    min-width: 20px;
  }

  .file-name {
    color: #333;
    font-size: 0.85rem;
    word-break: break-word;
  }

  .file-item.selected .file-name {
    color: white;
  }

  .file-item.not-in-database .file-name {
    color: #dc3545 !important;
    font-weight: 600;
  }

  .file-item.selected.not-in-database .file-name {
    color: white !important;
  }

  .empty-state-sidebar {
    padding: 1rem;
    text-align: center;
    color: #999;
    font-size: 0.95rem;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: #999;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #555;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 0.95rem;
    font-family: inherit;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #667eea;
  }

  .btn-save {
    padding: 0.75rem 1.5rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 600;
    transition: background 0.2s ease;
  }

  .btn-save:hover {
    background: #5568d3;
  }

  .save-message {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #d4edda;
    color: #155724;
    border-radius: 4px;
    font-size: 0.9rem;
  }
</style>
