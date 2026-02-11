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
    <p>Select a video to start playback</p>
  </div>

  <div class="player-controls">
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
    applyGain,
    audioContext,
    currentTime,
    duration,
    isMuted,
    isPlaying,
    loadSelectedVideo,
    playNext,
    playVideoNow,
    queuedVideos,
    selectedVideo,
    shuffleHistory,
    suppressHistoryOnce,
    videoEl,
    videoSrc,
    volume,
    volumeBeforeMute,
  } from '../../../shared/composables/useSidebarState'
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

<style scoped>
  .control-btn {
    border: none;
    background: rgba(255, 255, 255, 0.12);
    color: #f9fafb;
    padding: 0.5rem 0.7rem;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
  }

  .control-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .control-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.75rem;
  }

  .control-spacer {
    height: 1px;
  }

  .panel-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: #111827;
  }

  .player-controls {
    position: absolute;
    left: 50%;
    bottom: 0.25rem;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    background: rgba(31, 41, 55, 0.88);
    padding: 0.75rem 1rem;
    border-radius: 10px;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
    opacity: 0;
    transition: opacity 0.2s ease;
    width: 60%;
    max-width: 60vw;
    z-index: 3;
  }

  .player-icon {
    font-size: 3rem;
  }

  .player-placeholder {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 1rem;
  }

  .player-video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #0b0f1a;
    z-index: 1;
  }

  .progress-bar {
    flex: 1;
    cursor: pointer;
    user-select: none;
    touch-action: none;
  }

  .progress-bar:active {
    cursor: grabbing;
  }

  .progress-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: #667eea;
    width: 0%;
    transition: width 0.1s linear;
  }

  .progress-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }

  .progress-track {
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    position: relative;
    overflow: hidden;
  }

  .time-label {
    font-size: 0.85rem;
    color: #e5e7eb;
    min-width: 48px;
    text-align: center;
  }

  .transport-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }

  .volume-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    justify-self: end;
  }

  .volume-label {
    font-size: 0.78rem;
    color: #e5e7eb;
    min-width: 36px;
    text-align: right;
  }

  .volume-slider {
    width: 110px;
    appearance: none;
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.35);
    outline: none;
  }

  .volume-slider::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #667eea;
    box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.8);
    cursor: pointer;
  }

  .volume-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #667eea;
    border: none;
    box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.8);
    cursor: pointer;
  }
</style>
