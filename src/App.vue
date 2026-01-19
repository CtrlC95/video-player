<template>
  <div id="app">
    <header class="app-header">
      <nav class="app-nav">
        <button
          class="nav-button nav-left"
          :class="{ active: selectedApp === 'tagging-tool' }"
          @click="selectedApp = 'tagging-tool'"
        >
          Tagging Tool
        </button>
        <button
          class="nav-button nav-center"
          :class="{ active: selectedApp === 'video-player' }"
          @click="selectedApp = 'video-player'"
        >
          Video Player
        </button>
        <button
          class="nav-button nav-right"
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
  import { ref } from 'vue'
  import VideoPlayerApp from './apps/video-player/App.vue'
  import TaggingToolApp from './apps/tagging-tool/App.vue'
  import EditToolApp from './apps/edit-tool/App.vue'

  const selectedApp = ref<'video-player' | 'tagging-tool' | 'edit-tool'>('video-player')
</script>

<style scoped>
  #app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    padding: 0rem;
    margin: 0;
    position: relative;
  }

  .app-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    width: 100%;
    opacity: 0;
    transition: opacity 0.3s ease;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 100;
  }

  .app-header:hover {
    opacity: 1;
  }

  .app-nav {
    display: flex;
    align-items: center;
    gap: 0;
    width: 100%;
    position: relative;
  }

  .nav-button {
    padding: 0.5rem 1.5rem;
    background: transparent;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: background-color 0.2s ease;
  }

  .nav-button.nav-left {
    flex: 1;
    text-align: center;
  }

  .nav-button.nav-center {
    flex: 1;
    text-align: center;
  }

  .nav-button.nav-right {
    flex: 1;
    text-align: center;
  }

  .nav-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .nav-button.active {
    background-color: rgba(255, 255, 255, 0.25);
    border-bottom: 3px solid white;
  }

  .app-container {
    flex: 1;
    padding: 0;
    margin: 0;
    overflow-y: auto;
    width: 100%;
    height: 100%;
  }
</style>
