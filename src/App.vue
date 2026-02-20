<template>
  <div id="app" :class="{ 'is-borderless': isBorderless, 'nav-visible': navHoverActive }">
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
  const isBorderless = ref(false)
  const navHoverActive = ref(false)
  const isInTauri = ref(false)
  let appWindow: any = null

  async function toggleBorderless() {
    try {
      const newState = !isBorderless.value

      if (isInTauri.value && appWindow) {
        // Tauri fullscreen
        await appWindow.setFullscreen(newState)
      } else {
        // Browser fullscreen API
        if (newState) {
          await document.documentElement.requestFullscreen()
        } else {
          await document.exitFullscreen()
        }
      }

      isBorderless.value = newState
    } catch (err) {
      console.error('Failed to toggle fullscreen', err)
    }
  }

  async function handleMaximize() {
    await toggleBorderless()
  }

  onMounted(async () => {
    // Check if we're in a Tauri context
    if (window.__TAURI__) {
      isInTauri.value = true
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      appWindow = getCurrentWindow()
      isBorderless.value = await appWindow.isFullscreen()
    } else {
      // Browser only
      isBorderless.value = !!document.fullscreenElement
    }

    // Listen for F11 to toggle fullscreen
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F11') {
        e.preventDefault()
        toggleBorderless()
      }
    })

    // Listen for fullscreen changes from external sources (browser)
    document.addEventListener('fullscreenchange', () => {
      if (!isInTauri.value) {
        isBorderless.value = !!document.fullscreenElement
      }
    })
  })

  onBeforeUnmount(() => {
    // Cleanup is handled by Tauri/Browser
  })
</script>

<style src="./style.css"></style>
