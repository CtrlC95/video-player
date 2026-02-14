<template>
  <section class="center-stage">
    <div class="center-stack">
      <div class="center-toolbar">
        <div class="info-pill">
          <span class="info-label">File</span>
          <span class="info-value">{{ selectedFileName || '' }}</span>
        </div>
        <div class="info-pill">
          <span class="info-label">Export</span>
          <span class="info-value">
            {{ exportPath && renderFolderName ? `${exportPath}/${renderFolderName}` : '' }}
          </span>
        </div>
      </div>
      <div class="video-shell">
        <video
          ref="videoEl"
          class="edit-video"
          :src="videoUrl"
          playsinline
          @click="togglePlayPause"
        ></video>
        <div v-if="!selectedFilePath" class="video-overlay">
          <p>Select a file to preview</p>
        </div>
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
        <div class="range-row">
          <div class="range-bar">
            <div
              v-for="segment in rangeSegments"
              :key="segment.id"
              class="range-segment"
              :style="{
                left: segment.left + '%',
                width: segment.width + '%',
                backgroundColor: segment.color,
              }"
              :title="segment.label"
            ></div>
          </div>
        </div>
        <div class="control-row">
          <div class="control-spacer"></div>
          <div class="transport-controls">
            <button class="control-btn" @click="stepFrames(-5)">⏮</button>
            <button class="control-btn" @click="togglePlayPause">
              {{ isPlaying ? '⏸' : '▶' }}
            </button>
            <button class="control-btn" @click="stepFrames(5)">⏭</button>
          </div>
          <div class="control-spacer"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, ref, watch, onMounted } from 'vue'
  import { formatTime } from '../../../shared/utils/editingUtils'
  import {
    currentTime,
    duration,
    exportPath,
    ranges,
    selectedFilePath,
    renderFolderName,
    selectedFileName,
    videoUrl,
  } from '../../../shared/composables/useEditingState'

  onMounted(() => {
    console.log('VideoEdit mounted')
    setTimeout(() => {
      const video = document.querySelector('video.edit-video') as HTMLVideoElement | null
      if (video) {
        console.log('VideoEdit: video element src on mount:', video.src)
      } else {
        console.log('VideoEdit: no video element found on mount')
      }
    }, 100)
  })

  watch(videoUrl, (val) => {
    console.log('VideoEdit: videoUrl changed:', val)
    setTimeout(() => {
      const video = document.querySelector('video.edit-video') as HTMLVideoElement | null
      if (video) {
        console.log('VideoEdit: video element src after videoUrl change:', video.src)
      } else {
        console.log('VideoEdit: no video element found after videoUrl change')
      }
    }, 100)
  })

  const videoEl = ref<HTMLVideoElement | null>(null)
  const isPlaying = ref(false)
  const isScrubbing = ref(false)
  const progressBarEl = ref<HTMLElement | null>(null)
  const rangeColors = ['#60a5fa', '#f97316', '#34d399', '#f472b6', '#a78bfa', '#facc15']

  const currentTimeLabel = computed(() => formatTime(currentTime.value))
  const durationLabel = computed(() => formatTime(duration.value))
  const progressPercent = computed(() =>
    duration.value > 0 ? Math.min(100, (currentTime.value / duration.value) * 100) : 0
  )
  const rangeSegments = computed(() => {
    if (duration.value <= 0) return []
    return ranges.value
      .map((range, index) => {
        const start = Math.max(0, Math.min(range.start, duration.value))
        const end = Math.max(start, Math.min(range.end, duration.value))
        const left = (start / duration.value) * 100
        const width = ((end - start) / duration.value) * 100
        return {
          id: range.id,
          left,
          width,
          color: rangeColors[index % rangeColors.length],
          label: range.tag,
        }
      })
      .filter((segment) => segment.width > 0)
  })

  function stepFrames(frameDelta: number) {
    const el = videoEl.value
    if (!el || duration.value <= 0) return
    const fps = 30
    const stepSeconds = (1 / fps) * frameDelta
    const nextTime = Math.min(Math.max(el.currentTime + stepSeconds, 0), duration.value)
    el.currentTime = nextTime
    currentTime.value = nextTime
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

  async function togglePlayPause() {
    const el = videoEl.value
    if (!el) return

    if (el.paused) {
      try {
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

  watch(videoEl, (el, _, onCleanup) => {
    if (!el) return
    const handlePlay = () => {
      isPlaying.value = true
    }
    const handlePause = () => {
      isPlaying.value = false
    }
    const handleTimeUpdate = () => {
      currentTime.value = el.currentTime || 0
    }
    const handleLoadedMetadata = () => {
      duration.value = el.duration || 0
    }
    const handleDurationChange = () => {
      duration.value = el.duration || 0
    }

    el.addEventListener('play', handlePlay)
    el.addEventListener('pause', handlePause)
    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('loadedmetadata', handleLoadedMetadata)
    el.addEventListener('durationchange', handleDurationChange)

    onCleanup(() => {
      el.removeEventListener('play', handlePlay)
      el.removeEventListener('pause', handlePause)
      el.removeEventListener('timeupdate', handleTimeUpdate)
      el.removeEventListener('loadedmetadata', handleLoadedMetadata)
      el.removeEventListener('durationchange', handleDurationChange)
    })
  })
</script>

<style src="../views/VideoEdit.css"></style>
