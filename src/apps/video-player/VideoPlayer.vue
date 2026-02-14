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
    isPlaying,
    isMuted,
    volume,
    videoEl,
    duration,
    currentTime,
    videoWidth,
    videoHeight,
    volumeBeforeMute,
  } from '../../shared/composables/useVideoplayerState'
  import RightSidebar from './components/RightSidebar.vue'
  import VideoPlayer from './components/VideoPlayer.vue'
  import { applyGain, ensureAudioPipeline, playNext } from '../../shared/utils/videoPlayerUtils'

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

<style src="./VideoPlayer.css"></style>
