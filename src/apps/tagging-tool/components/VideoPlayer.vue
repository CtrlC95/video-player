<template>
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
        autoplay
        class="video-player"
      ></video>
      <div v-else class="video-placeholder">Loading video...</div>
    </div>
  </main>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import type { FileItem } from '../../../shared/composables/useFileBrowser'

  interface Props {
    currentPath: string
    selectedFile: FileItem | null
    directoryHandle: any
  }

  const props = defineProps<Props>()

  const videoUrl = ref('')
  // videoPlayer ref removed (was unused)

  watch(
    () => props.selectedFile,
    async (newFile) => {
      // Clean up old URL
      if (videoUrl.value) {
        URL.revokeObjectURL(videoUrl.value)
      }

      if (!newFile || !props.directoryHandle) {
        videoUrl.value = ''
        return
      }

      try {
        let fileHandle = newFile.handle

        // If no handle, try to get it from the directory
        if (!fileHandle) {
          fileHandle = await props.directoryHandle.getFileHandle(newFile.name)
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
</script>

<style scoped>
  .main-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #111827;
  }

  .player-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
  }

  .video-player {
    width: 100%;
    aspect-ratio: 16 / 9;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    background: #0b0f1a;
  }

  .video-placeholder {
    width: 100%;
    aspect-ratio: 16 / 9;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    background: #0b0f1a;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5f5;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: #cbd5f5;
  }
</style>
