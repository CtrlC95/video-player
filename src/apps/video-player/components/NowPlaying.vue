<template>
  <div class="now-playing">
    <!-- <div class="now-playing hidden"> -->
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
  import { selectedVideo } from '../../../shared/composables/useVideoplayerState'

  const nowPlayingSong = computed(() => selectedVideo.value?.songName ?? '')
  const nowPlayingArtist = computed(() => selectedVideo.value?.artist ?? '')
  const nowPlayingCreator = computed(() => selectedVideo.value?.creator ?? '')
</script>

<style src="../views/NowPlaying.css"></style>
