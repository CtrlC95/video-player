<template>
  <div class="video-player-app">
    <main class="player-main">
      <div class="player-stage" @wheel.prevent="handleVolumeWheel">
        <LeftSidebar />
        <NowPlaying />
        <VideoPlayer />
        <RightSidebar />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
  import { watch } from 'vue'
  import { videoDataService } from '../../shared/services/videoDataService'
  import type { VideoMetadata } from '../../shared/types/media'
  import LeftSidebar from './components/LeftSidebar.vue'
  import NowPlaying from './components/NowPlaying.vue'
  import {
    playMode,
    queuedVideos,
    videosInDatabase,
    lastWeightedCandidates,
    lastWeightedPick,
    playNext,
    isPlaying,
    isMuted,
    volume,
    videoEl,
    duration,
    currentTime,
    videoWidth,
    videoHeight,
    applyGain,
    ensureAudioPipeline,
    volumeBeforeMute,
  } from '../../shared/composables/useSidebarState'
  import RightSidebar from './components/RightSidebar.vue'
  import VideoPlayer from './components/VideoPlayer.vue'

  function applyWeightUpdates(picked: VideoMetadata, candidates: VideoMetadata[]) {
    const pickedName = picked.fileName
    const updated = videosInDatabase.value.map((video) => {
      const isCandidate = candidates.some((c) => c.fileName === video.fileName)
      if (!isCandidate) return video
      const nextWeight = video.fileName === pickedName ? 1 : Math.max(1, video.weightScore || 1) + 1
      return { ...video, weightScore: nextWeight }
    })
    videosInDatabase.value = updated
    videoDataService.saveVideos(updated)
  }

  function handleVolumeWheel(event: WheelEvent) {
    if (!event) return
    const direction = event.deltaY > 0 ? -1 : 1
    const step = 0.05
    const next = Math.min(2, Math.max(0, volume.value + direction * step))
    volume.value = next
    if (next > 0) {
      volumeBeforeMute.value = next
      isMuted.value = false
    }
    applyGain()
  }

  function handlePlay() {
    isPlaying.value = true
  }

  function handlePause() {
    isPlaying.value = false
  }

  watch(videoEl, (el, _, onCleanup) => {
    if (!el) return
    ensureAudioPipeline(el)
    el.addEventListener('play', handlePlay)
    el.addEventListener('pause', handlePause)
    const handleTimeUpdate = () => {
      currentTime.value = el.currentTime || 0
    }
    const handleLoadedMetadata = () => {
      duration.value = el.duration || 0
      videoWidth.value = el.videoWidth || 0
      videoHeight.value = el.videoHeight || 0
    }
    const handleDurationChange = () => {
      duration.value = el.duration || 0
    }

    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('loadedmetadata', handleLoadedMetadata)
    el.addEventListener('durationchange', handleDurationChange)
    const handleEnded = () => {
      if (
        (playMode.value === 'shuffle' || playMode.value === 'shuffle-tags') &&
        lastWeightedPick.value
      ) {
        applyWeightUpdates(lastWeightedPick.value, lastWeightedCandidates.value)
        lastWeightedPick.value = null
        lastWeightedCandidates.value = []
      }
      if (playMode.value === 'search' && queuedVideos.value.length === 0) {
        playMode.value = 'shuffle'
      }
      playNext()
    }
    el.addEventListener('ended', handleEnded)

    onCleanup(() => {
      el.removeEventListener('play', handlePlay)
      el.removeEventListener('pause', handlePause)
      el.removeEventListener('timeupdate', handleTimeUpdate)
      el.removeEventListener('loadedmetadata', handleLoadedMetadata)
      el.removeEventListener('durationchange', handleDurationChange)
      el.removeEventListener('ended', handleEnded)
    })
  })
</script>

<style>
  .panel-block {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 160px;
    align-items: center;
  }

  .panel-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #cbd5f5;
    margin: 0;
    text-align: center;
  }

  .panel-value {
    margin: 0;
    font-size: 0.95rem;
    color: #f9fafb;
    text-align: center;
  }

  .player-main {
    display: flex;
    flex-direction: column;
    padding: 0%;
    height: 100vh;
    max-height: 100vh;
    background: #111827;
  }

  .player-stage {
    background: #111827;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d1d5db;
    position: relative;
    overflow: hidden;
    width: 100%;
    flex: 1;
    height: 100%;
    min-height: 0;
    max-height: 100vh;
  }

  .sidebar-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;
    height: 100%;
    max-height: 100vh;
    box-sizing: border-box;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.5rem;
  }

  .tag-list-sidebar {
    justify-content: center;
  }

  .tag-selected {
    padding: 0.35rem 0.6rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: #e5e7eb;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .left-sidebar:hover,
  .now-playing:hover,
  .right-sidebar:hover,
  .player-controls:hover {
    opacity: 1;
  }

  .tag-selected:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .tag-selected-static {
    cursor: default;
  }

  .tag-selected-static:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .video-player-app {
    width: 100%;
    height: 100vh;
    display: grid;
    grid-template-columns: 1fr;
    background: #f3f4f6;
    color: #333;
  }

  @media (max-width: 900px) {
    .video-player-app {
      grid-template-columns: 1fr;
    }
  }
</style>
