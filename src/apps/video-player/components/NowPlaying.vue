<template>
  <div class="now-playing">
    <div class="panel-block">
      <p class="panel-label">Song</p>
      <p class="panel-value">{{ nowPlayingSong || '—' }}</p>
    </div>
    <div class="panel-block">
      <p class="panel-label">Artist</p>
      <p class="panel-value">{{ nowPlayingArtist || '—' }}</p>
    </div>
    <div class="panel-block">
      <p class="panel-label">Creator</p>
      <p class="panel-value">{{ nowPlayingCreator || '—' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { selectedVideo } from '../../../shared/composables/useSidebarState'

  const nowPlayingSong = computed(() => selectedVideo.value?.songName ?? '')
  const nowPlayingArtist = computed(() => selectedVideo.value?.artist ?? '')
  const nowPlayingCreator = computed(() => selectedVideo.value?.creator ?? '')
</script>

<style scoped>
  .now-playing {
    position: absolute;
    top: 0.25rem;
    left: 0.25rem;
    right: 0.25rem;
    display: flex;
    flex-direction: row;
    gap: 0.75rem;
    justify-content: center;
    align-items: center;
    background: rgba(31, 41, 55, 0.88);
    padding: 0.75rem 1rem;
    border-radius: 10px;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
    opacity: 0;
    transition: opacity 0.2s ease;
    width: auto;
    z-index: 4;
    pointer-events: auto;
  }
</style>
