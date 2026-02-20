<template>
  <div id="app" :class="{ 'is-fullscreen': isFullscreen, 'nav-visible': navHoverActive }">
    <div
      class="nav-hover-zone"
      @mouseenter="navHoverActive = true"
      @mouseleave="navHoverActive = false"
    ></div>
    <header
      class="app-header hidden"
      @mouseenter="navHoverActive = true"
      @mouseleave="navHoverActive = false"
    >
      <nav class="app-nav">
        <button class="nav-button nav-fullscreen" @click="toggleFullscreen">
          {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
        </button>
        <button
          class="nav-button"
          :class="{ active: selectedApp === 'tagging-tool' }"
          @click="selectedApp = 'tagging-tool'"
        >
          Tagging Tool
        </button>
        <button
          class="nav-button"
          :class="{ active: selectedApp === 'video-player' }"
          @click="selectedApp = 'video-player'"
        >
          Video Player
        </button>
        <button
          class="nav-button"
          :class="{ active: selectedApp === 'edit-tool' }"
          @click="selectedApp = 'edit-tool'"
        >
          Edit Tool
        </button>
      </nav>
    </header>

    <main class="app-container">
      <VideoPlayerApp v-if="selectedApp === 'video-player'" />
      <TaggingToolApp v-else-if="selectedApp === 'tagging-tool'" />
      <EditToolApp v-else-if="selectedApp === 'edit-tool'" />
    </main>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onBeforeUnmount } from 'vue'
  import VideoPlayerApp from './apps/video-player/VideoPlayer.vue'
  import TaggingToolApp from './apps/tagging-tool/Tagging-Tool.vue'
  import EditToolApp from './apps/edit-tool/EditTool.vue'

  const selectedApp = ref<'video-player' | 'tagging-tool' | 'edit-tool'>('tagging-tool')
  const isFullscreen = ref(false)
  const navHoverActive = ref(false)

  function handleFullscreenChange() {
    isFullscreen.value = Boolean(document.fullscreenElement)
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error('Failed to toggle fullscreen', err)
    }
  }

  onMounted(() => {
    isFullscreen.value = Boolean(document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
  })
</script>

<style src="./style.css"></style>
