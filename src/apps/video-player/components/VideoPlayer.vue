<template>
  <video
    v-if="videoSrc"
    ref="videoEl"
    class="player-video"
    :src="videoSrc"
    playsinline
    @click="togglePlayPause"
  ></video>
  <div v-else class="player-placeholder">
    <div class="player-icon">▶</div>
    <p>Select directory to start playback</p>
  </div>

  <div class="player-controls hidden">
    <div class="progress-row">
      <span class="time-label">{{ currentTimeLabel }}</span>
      <div class="progress-bar" ref="progressBarEl" @pointerdown="handleProgressPointerDown">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
      </div>
      <span class="time-label">{{ durationLabel }}</span>
    </div>
    <div class="control-row">
      <div class="control-spacer"></div>
      <div class="transport-controls">
        <button class="control-btn" :disabled="!shuffleHistory.length" @click="handleBackClick">
          ⏮
        </button>
        <button class="control-btn" @click="togglePlayPause">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        <button class="control-btn" @click="playNext">⏭</button>
      </div>
      <div class="volume-control">
        <button class="control-btn" @click="toggleMute">
          {{ isMuted ? '🔇' : '🔊' }}
        </button>
        <span class="volume-label">{{ volumePercent }}</span>
        <input
          class="volume-slider"
          type="range"
          min="0"
          max="2"
          step="0.01"
          :value="volume"
          @input="handleVolumeInput"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import {
    audioContext,
    currentTime,
    duration,
    isMuted,
    isPlaying,
    queuedVideos,
    selectedVideo,
    shuffleHistory,
    suppressHistoryOnce,
    videoEl,
    videoSrc,
    volume,
    volumeBeforeMute,
  } from '../../../shared/composables/useVideoplayerState'
  import {
    applyGain,
    loadSelectedVideo,
    playNext,
    playVideoNow,
  } from '../../../shared/utils/videoPlayerUtils'
  import { useVideoFileBrowser } from '../../../shared/composables/useFileBrowser'

  const { directoryHandle } = useVideoFileBrowser()
  const isScrubbing = ref(false)
  const progressBarEl = ref<HTMLElement | null>(null)

  const currentTimeLabel = computed(() => formatTime(currentTime.value))
  const durationLabel = computed(() => formatTime(duration.value))
  const volumePercent = computed(() => `${Math.round(volume.value * 100)}%`)
  const progressPercent = computed(() =>
    duration.value > 0 ? Math.min(100, (currentTime.value / duration.value) * 100) : 0
  )

  function toggleMute() {
    isMuted.value = !isMuted.value
    if (isMuted.value) {
      volumeBeforeMute.value = volume.value
    } else {
      volume.value = volumeBeforeMute.value || 1
    }
    applyGain()
  }

  function handleVolumeInput(event: Event) {
    const target = event.target as HTMLInputElement
    const nextVolume = Number(target.value)
    if (!Number.isFinite(nextVolume)) return
    volume.value = nextVolume
    if (nextVolume > 0) {
      volumeBeforeMute.value = nextVolume
      isMuted.value = false
    }
    applyGain()
  }

  function formatTime(totalSeconds: number) {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '00:00'
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  function updateTimeFromClientX(clientX: number) {
    const target = progressBarEl.value
    if (!target) return
    const rect = target.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    const percent = rect.width > 0 ? x / rect.width : 0
    if (duration.value > 0 && videoEl.value) {
      const newTime = duration.value * percent
      videoEl.value.currentTime = newTime
      currentTime.value = newTime
    }
  }

  function handleProgressPointerDown(event: PointerEvent) {
    if (!videoEl.value || duration.value <= 0) return
    isScrubbing.value = true
    progressBarEl.value?.setPointerCapture(event.pointerId)
    updateTimeFromClientX(event.clientX)

    const handlePointerMove = (e: PointerEvent) => {
      if (!isScrubbing.value) return
      updateTimeFromClientX(e.clientX)
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId === event.pointerId) {
        isScrubbing.value = false
        progressBarEl.value?.releasePointerCapture(event.pointerId)
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  async function togglePlayPause() {
    const el = videoEl.value
    if (!el) return

    if (el.paused) {
      try {
        await resumeAudioContext()
        await el.play()
        isPlaying.value = true
      } catch {
        isPlaying.value = false
      }
    } else {
      el.pause()
      isPlaying.value = false
    }
  }

  async function handleBackClick() {
    if (!shuffleHistory.value.length) return
    const previous = shuffleHistory.value[0]
    shuffleHistory.value = shuffleHistory.value.slice(1)
    if (selectedVideo.value) {
      queuedVideos.value = [selectedVideo.value, ...queuedVideos.value]
    }
    suppressHistoryOnce.value = true
    if (previous) await playVideoNow(previous)
  }

  async function resumeAudioContext() {
    if (!audioContext.value) return
    if (audioContext.value.state === 'suspended') {
      try {
        await audioContext.value.resume()
      } catch {
        // ignore resume failures
      }
    }
  }

  watch([selectedVideo, directoryHandle], () => {
    loadSelectedVideo()
  })
</script>

<style src="../views/VideoPlayer.css"></style>
