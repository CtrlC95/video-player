<template>
  <div class="edit-tool-app">
    <div class="edit-layout">
      <aside class="left-sidebar">
        <div class="panel-block">
          <label class="file-picker">
            <input class="file-input" type="file" accept="video/*" @change="handleFileSelect" />
            <span class="btn-select">Select file</span>
          </label>
          <button class="btn-select" @click="selectExportDirectory">Select export folder</button>
        </div>

        <div v-if="canEditRanges" class="panel-block">
          <label class="panel-label" for="segment-length">Segment length (s)</label>
          <input
            id="segment-length"
            v-model.number="segmentLength"
            class="segment-input"
            type="number"
            min="1"
            step="1"
          />
          <button class="btn-select" type="button" @click="addRange">Add range</button>
        </div>

        <div v-if="canEditRanges" class="panel-block">
          <p class="panel-label">Ranges</p>
          <div v-if="ranges.length" class="range-list">
            <div v-for="(range, index) in ranges" :key="range.id" class="range-item">
              <input v-model="range.tag" class="range-input" type="text" placeholder="Tag" />
              <div class="range-times">
                <input
                  :value="formatTime(range.start)"
                  class="range-input"
                  type="text"
                  inputmode="numeric"
                  placeholder="Start (mm:ss)"
                  @input="(event) => updateRangeTime(range, index, 'start', event)"
                />
                <button
                  class="time-btn"
                  type="button"
                  title="Set start to current time"
                  @click="setRangeTime(range, index, 'start')"
                >
                  +
                </button>
                <input
                  :value="formatTime(range.end)"
                  class="range-input"
                  type="text"
                  inputmode="numeric"
                  placeholder="End (mm:ss)"
                  @input="(event) => updateRangeTime(range, index, 'end', event)"
                />
                <button
                  class="time-btn"
                  type="button"
                  title="Set end to current time"
                  @click="setRangeTime(range, index, 'end')"
                >
                  +
                </button>
              </div>
              <button class="btn-ghost" type="button" @click="removeRange(range.id)">Remove</button>
            </div>
          </div>
          <p v-else class="range-empty">No ranges yet.</p>
        </div>
      </aside>

      <section class="center-stage">
        <div class="center-stack">
          <div class="center-toolbar">
            <div class="info-pill">
              <span class="info-label">File</span>
              <span class="info-value">{{ selectedFile?.name || '' }}</span>
            </div>
            <div class="info-pill">
              <span class="info-label">Export</span>
              <span class="info-value">{{ exportPath || '' }}</span>
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
            <div v-if="!selectedFile" class="video-overlay">
              <p>Select a file to preview</p>
            </div>
          </div>
          <div class="player-controls">
            <div class="progress-row">
              <span class="time-label">{{ currentTimeLabel }}</span>
              <div
                class="progress-bar"
                ref="progressBarEl"
                @pointerdown="handleProgressPointerDown"
              >
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
                <button class="control-btn" @click="togglePlayPause">
                  {{ isPlaying ? '⏸' : '▶' }}
                </button>
              </div>
              <div class="control-spacer"></div>
            </div>
          </div>
        </div>
      </section>

      <aside class="right-sidebar">
        <div class="panel-block">
          <p class="panel-label">Ranges</p>
          <div class="range-menu">
            <button
              class="range-nav-btn"
              type="button"
              :disabled="selectedRangeIndex <= -1"
              @click="selectPrevRange"
            >
              <span class="range-nav-icon">◀</span>
            </button>
            <div class="range-pill">
              <span class="range-pill-text">{{ selectedRangeLabel }}</span>
            </div>
            <button
              class="range-nav-btn"
              type="button"
              :disabled="selectedRangeIndex >= maxRangeIndex"
              @click="selectNextRange"
            >
              <span class="range-nav-icon">▶</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, computed, onBeforeUnmount } from 'vue'

  const exportPath = ref('')
  const exportDirectoryHandle = ref<any | null>(null)
  const selectedFile = ref<File | null>(null)
  const videoUrl = ref('')
  const videoEl = ref<HTMLVideoElement | null>(null)
  const segmentLength = ref(15)
  const ranges = ref<Array<{ id: string; tag: string; start: number; end: number }>>([])
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const isScrubbing = ref(false)
  const progressBarEl = ref<HTMLElement | null>(null)
  let rangeCounter = 1
  let currentObjectUrl: string | null = null

  const currentTimeLabel = computed(() => formatTime(currentTime.value))
  const durationLabel = computed(() => formatTime(duration.value))
  const progressPercent = computed(() =>
    duration.value > 0 ? Math.min(100, (currentTime.value / duration.value) * 100) : 0
  )
  const canEditRanges = computed(() => Boolean(selectedFile.value) && Boolean(exportPath.value))
  const selectedRangeIndex = ref(-1)
  const maxRangeIndex = computed(() => ranges.value.length - 1)
  const selectedRangeLabel = computed(() => {
    if (selectedRangeIndex.value < 0) return 'Video'
    const range = ranges.value[selectedRangeIndex.value]
    if (!range) return 'Video'
    return range.tag || `Range ${selectedRangeIndex.value + 1}`
  })
  const rangeColors = ['#60a5fa', '#f97316', '#34d399', '#f472b6', '#a78bfa', '#facc15']
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

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0] || null
    selectedFile.value = file
  }

  async function selectExportDirectory() {
    try {
      const dirHandle = await (window as any).showDirectoryPicker()
      exportDirectoryHandle.value = dirHandle
      exportPath.value = dirHandle?.name || ''
    } catch (err) {
      console.error('Failed to select export directory', err)
    }
  }

  watch(selectedFile, (file) => {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
      currentObjectUrl = null
    }

    if (file) {
      currentObjectUrl = URL.createObjectURL(file)
      videoUrl.value = currentObjectUrl
    } else {
      videoUrl.value = ''
    }
  })

  watch(ranges, (nextRanges) => {
    if (nextRanges.length === 0) {
      selectedRangeIndex.value = -1
      return
    }
    if (selectedRangeIndex.value > nextRanges.length - 1) {
      selectedRangeIndex.value = nextRanges.length - 1
    }
  })

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

  onBeforeUnmount(() => {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
      currentObjectUrl = null
    }
  })

  function addRange() {
    const id = `range-${rangeCounter}`
    const lastRange = ranges.value.length ? ranges.value[ranges.value.length - 1] : null
    const maxEnd = duration.value > 0 ? duration.value : Infinity

    if (!lastRange) {
      const start = Math.max(0, currentTime.value)
      const length = Math.max(0, segmentLength.value)
      const end = Math.min(start + length, maxEnd)
      ranges.value.push({ id, tag: `Range ${rangeCounter}`, start, end })
    } else {
      const lastEnd = Math.max(0, lastRange.end)
      const lastLength = Math.max(0, lastRange.end - lastRange.start)
      const nextEnd = Math.min(lastEnd + lastLength, maxEnd)
      ranges.value.push({ id, tag: `Range ${rangeCounter}`, start: lastEnd, end: nextEnd })
    }
    rangeCounter += 1
  }

  function removeRange(id: string) {
    ranges.value = ranges.value.filter((range) => range.id !== id)
  }

  function selectPrevRange() {
    selectedRangeIndex.value = Math.max(-1, selectedRangeIndex.value - 1)
  }

  function selectNextRange() {
    selectedRangeIndex.value = Math.min(maxRangeIndex.value, selectedRangeIndex.value + 1)
  }

  function formatTime(totalSeconds: number) {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '00:00'
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  function parseTimeInput(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return 0
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const secondsOnly = Number(trimmed)
      return Number.isFinite(secondsOnly) ? Math.max(0, secondsOnly) : 0
    }
    const parts = trimmed.split(':').map((part) => part.trim())
    if (parts.length === 2) {
      const minutes = Number(parts[0])
      const seconds = Number(parts[1])
      if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return 0
      return Math.max(0, minutes * 60 + seconds)
    }
    if (parts.length === 3) {
      const hours = Number(parts[0])
      const minutes = Number(parts[1])
      const seconds = Number(parts[2])
      if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
        return 0
      }
      return Math.max(0, hours * 3600 + minutes * 60 + seconds)
    }
    return 0
  }

  function updateRangeTime(
    range: { start: number; end: number },
    index: number,
    field: 'start' | 'end',
    event: Event
  ) {
    const target = event.target as HTMLInputElement
    const nextValue = parseTimeInput(target.value)
    range[field] = nextValue
    clampRange(index)
  }

  function setRangeTime(
    range: { start: number; end: number },
    index: number,
    field: 'start' | 'end'
  ) {
    range[field] = currentTime.value
    clampRange(index)
  }

  function clampRange(index: number) {
    const range = ranges.value[index]
    if (!range) return

    const prev = ranges.value[index - 1]
    const next = ranges.value[index + 1]
    const minStart = prev ? Math.max(prev.end, 0) : 0
    const maxEnd = next ? Math.max(next.start, 0) : Infinity

    if (range.start < minStart) {
      range.start = minStart
    }
    if (range.end < range.start) {
      range.end = range.start
    }
    if (range.end > maxEnd) {
      range.end = maxEnd
    }
    if (range.start > range.end) {
      range.start = range.end
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
</script>

<style scoped>
  .edit-tool-app {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #111827;
    color: #e5e7eb;
  }

  .edit-tool-app,
  .edit-tool-app * {
    box-sizing: border-box;
  }

  .edit-layout {
    flex: 1;
    display: flex;
    gap: 1rem;
    padding: 1rem;
    min-height: 0;
  }

  .left-sidebar,
  .right-sidebar {
    width: 260px;
    background: rgba(17, 24, 39, 0.92);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1rem;
    min-height: 0;
  }

  .panel-block {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .panel-block .btn-select {
    width: 100%;
    text-align: left;
  }

  .panel-label {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9ca3af;
  }

  .segment-input {
    padding: 0.6rem 0.75rem;
    background: rgba(15, 23, 42, 0.75);
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 8px;
    color: #e5e7eb;
    font-size: 0.9rem;
  }

  .segment-input:focus {
    outline: 2px solid rgba(99, 102, 241, 0.45);
    border-color: transparent;
  }

  .range-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .range-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.65rem;
    background: rgba(12, 18, 30, 0.7);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 10px;
  }

  .range-times {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 32px minmax(0, 1fr) 32px;
    gap: 0.5rem;
    align-items: center;
  }

  .range-input {
    width: 100%;
    height: 32px;
    padding: 0.5rem 0.65rem;
    background: rgba(15, 23, 42, 0.75);
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 8px;
    color: #e5e7eb;
    font-size: 0.85rem;
  }

  .range-input:focus {
    outline: 2px solid rgba(99, 102, 241, 0.45);
    border-color: transparent;
  }

  .time-btn {
    height: 32px;
    width: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 8px;
    color: #e0e7ff;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .time-btn:hover {
    background: rgba(99, 102, 241, 0.35);
  }

  .btn-ghost {
    align-self: flex-start;
    padding: 0.35rem 0.6rem;
    background: transparent;
    border: 1px solid rgba(148, 163, 184, 0.35);
    border-radius: 8px;
    color: #cbd5f5;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .btn-ghost:hover {
    border-color: rgba(99, 102, 241, 0.6);
    color: #e0e7ff;
  }

  .range-empty {
    color: #9ca3af;
    font-size: 0.82rem;
  }

  .file-picker {
    display: inline-flex;
    align-items: center;
  }

  .file-input {
    display: none;
  }

  .btn-select {
    padding: 0.6rem 1rem;
    background: rgba(99, 102, 241, 0.2);
    color: #e0e7ff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition:
      background 0.2s ease,
      transform 0.2s ease;
  }

  .btn-select:hover {
    background: rgba(99, 102, 241, 0.35);
    transform: translateY(-1px);
  }

  .field-value {
    font-size: 0.85rem;
    color: #cbd5f5;
    word-break: break-word;
  }

  .center-stage {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
  }

  .center-stack {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .center-toolbar {
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
  }

  .info-pill {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.85rem;
    background: rgba(12, 18, 30, 0.7);
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 12px;
  }

  .info-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9ca3af;
    white-space: nowrap;
  }

  .info-value {
    font-size: 0.85rem;
    color: #e5e7eb;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .video-shell {
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
  }

  .player-controls {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    background: rgba(31, 41, 55, 0.88);
    padding: 0.75rem 1rem;
    border-radius: 10px;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
    width: 100%;
  }

  .progress-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }

  .range-row {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .range-bar {
    position: relative;
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    overflow: hidden;
  }

  .range-segment {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 999px;
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

  .transport-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }

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

  .time-label {
    font-size: 0.78rem;
    color: #e5e7eb;
    min-width: 42px;
    text-align: center;
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

  .progress-track {
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    position: relative;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea, #764ba2);
    border-radius: inherit;
  }

  .edit-video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #0b0f1a;
    z-index: 1;
  }

  .video-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 0.95rem;
    pointer-events: none;
  }

  .right-sidebar {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
  }

  .empty-panel {
    text-align: center;
    color: #9ca3af;
    font-size: 0.85rem;
  }

  .range-menu {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.35rem 0.1rem;
  }

  .range-menu > * {
    flex: 0 0 auto;
  }

  .range-menu .range-pill {
    width: 140px;
  }

  .range-nav-btn {
    width: 40px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(12, 18, 30, 0.45);
    border: none;
    border-radius: 8px;
    color: #cbd5f5;
    cursor: pointer;
  }

  .range-nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .range-nav-btn:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.2);
    color: #e0e7ff;
  }

  .range-nav-icon {
    font-size: 1.1rem;
  }

  .range-pill {
    flex: 1;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.75rem;
    background: rgba(12, 18, 30, 0.45);
    border: none;
    border-radius: 10px;
  }

  .range-pill-text {
    font-size: 0.85rem;
    color: #e5e7eb;
  }
</style>
