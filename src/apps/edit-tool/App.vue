<template>
  <div class="edit-tool-app">
    <div class="edit-layout">
      <aside class="left-sidebar">
        <div class="panel-block">
          <button class="btn-select" @click="selectSongFile">Select song</button>
          <button class="btn-select" type="button" @click="selectVideoFile">Select file</button>
          <button class="btn-select" @click="selectExportDirectory">Select export folder</button>
        </div>

        <div v-if="canEditRanges" class="panel-block">
          <label class="panel-label" for="segment-length">
            Segment length (s), BPS ({{ songBpsLabel }})
          </label>
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
          <div v-if="ranges.length" class="range-list scrollable-range-list">
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
              <button
                class="btn-ghost"
                type="button"
                :disabled="!canRender"
                @click="renderRange(index)"
              >
                Render range
              </button>
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

      <aside class="right-sidebar">
        <div class="panel-block">
          <p class="panel-label">Video tags</p>
          <input v-model="videoTagDraft" class="tag-input" type="text" placeholder="Input" />
          <button class="btn-select" type="button" @click="applyVideoTag">Apply</button>
          <ul v-if="currentTagList.length" class="tag-list">
            <li
              v-for="(tag, index) in currentTagList"
              :key="`${tag}-${index}`"
              class="tag-item"
              @click="removeTagAt(index)"
            >
              {{ tag }}
            </li>
          </ul>
        </div>

        <div v-if="canEditRanges" class="panel-block">
          <p v-if="selectedRangeOutputName" class="field-value">
            Selected output: {{ selectedRangeOutputName }}
          </p>
          <button class="btn-select" type="button" :disabled="!canRender" @click="renderClips">
            Render
          </button>
          <p v-if="renderMessage" class="field-value">{{ renderMessage }}</p>
          <div v-if="renderPreview.length" class="render-preview">
            <p class="panel-label">Preview</p>
            <ul class="render-list">
              <li v-for="item in renderPreview" :key="item.id" class="render-item">
                <span class="render-name">{{ item.name }}</span>
                <span class="render-count">{{ item.count }} clips</span>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, computed } from 'vue'
  import { invoke } from '@tauri-apps/api/core'
  import { open as openDialog } from '@tauri-apps/plugin-dialog'
  import { convertFileSrc } from '@tauri-apps/api/core'
  import { open as openFile } from '@tauri-apps/plugin-fs'

  const exportPath = ref('')
  const exportDirectoryPath = ref('')
  const selectedFilePath = ref('')
  const selectedFileName = ref('')
  const videoUrl = ref('')
  const videoEl = ref<HTMLVideoElement | null>(null)
  const segmentLength = ref(15)
  const selectedSongFile = ref<File | null>(null)
  const songBpm = ref<number | null>(null)
  const songBpmStatus = ref<'idle' | 'loading' | 'error'>('idle')
  const ranges = ref<Array<{ id: string; tag: string; start: number; end: number }>>([])
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const isScrubbing = ref(false)
  const progressBarEl = ref<HTMLElement | null>(null)
  let rangeCounter = 1

  const currentTimeLabel = computed(() => formatTime(currentTime.value))
  const durationLabel = computed(() => formatTime(duration.value))
  const progressPercent = computed(() =>
    duration.value > 0 ? Math.min(100, (currentTime.value / duration.value) * 100) : 0
  )
  const canEditRanges = computed(
    () => Boolean(selectedFilePath.value) && Boolean(exportDirectoryPath.value)
  )
  const songBpsLabel = computed(() => {
    if (songBpmStatus.value === 'loading') return '...'
    if (songBpmStatus.value === 'error') return 'error'
    if (songBpm.value === null) return '--'
    return (songBpm.value / 60).toFixed(2)
  })
  const videoGirlTag = ref('')
  const videoTagDraft = ref('')
  const currentTagList = computed(() => {
    return parseTagList(videoGirlTag.value)
  })
  const renderFolderName = computed(() => {
    if (!selectedFileName.value) return ''
    const baseName = sanitizeFilePart(stripExtension(selectedFileName.value))
    const tags = parseTagList(videoGirlTag.value)
      .map((tag) => sanitizeFilePart(tag))
      .filter(Boolean)
    if (!tags.length) return baseName
    return `[${tags.join(', ')}] ${baseName}`
  })
  const selectedRangeOutputName = computed(() => {
    const previewRange = ranges.value[0]
    if (!previewRange) return ''
    const totalSegments = getRangeSegmentCount(previewRange)
    return buildOutputSegmentName(previewRange, 0, 0, totalSegments)
  })
  const canRender = computed(() =>
    Boolean(canEditRanges.value && ranges.value.length && renderFolderName.value)
  )
  const renderMessage = ref('')
  const renderPreview = computed(() => {
    return ranges.value.map((range, index) => {
      const count = getRangeSegmentCount(range)
      return {
        id: range.id,
        name: buildOutputRangeName(range, index),
        count,
      }
    })
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

  async function selectVideoFile() {
    const selected = await openDialog({
      multiple: false,
      directory: false,
      filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'] }],
    })

    if (!selected || Array.isArray(selected)) return
    selectedFilePath.value = selected
    selectedFileName.value = fileNameFromPath(selected)
  }

  function selectSongFile() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*,video/*'
    input.addEventListener('change', () => {
      const file = input.files?.[0] || null
      selectedSongFile.value = file
    })
    input.click()
  }

  async function selectExportDirectory() {
    try {
      const selected = await openDialog({ directory: true, multiple: false })
      if (!selected || Array.isArray(selected)) return
      exportDirectoryPath.value = selected as string
      exportPath.value = fileNameFromPath(selected as string)
    } catch (err) {
      console.error('Failed to select export directory', err)
    }
  }

  watch(selectedFilePath, async (path) => {
    if (path) {
      // Use Blob for dev mode, convertFileSrc for production
      const isDev = window.location.protocol.startsWith('http')
      if (isDev) {
        try {
          const file = await openFile(path, { read: true })
          const stat = await file.stat()
          const buffer = new Uint8Array(stat.size)
          await file.read(buffer)
          const blob = new Blob([buffer], { type: 'video/mp4' })
          if (videoUrl.value) {
            URL.revokeObjectURL(videoUrl.value)
          }
          videoUrl.value = URL.createObjectURL(blob)
          await file.close()
          console.log('videoUrl (blob)', videoUrl.value)
        } catch (err) {
          console.error('Failed to load video file (dev mode)', err)
          videoUrl.value = ''
        }
      } else {
        videoUrl.value = convertFileSrc(path)
        console.log('videoUrl (tauri)', videoUrl.value)
      }
    } else {
      videoUrl.value = ''
    }
  })

  let songBpmRequestId = 0
  watch(selectedSongFile, async (file) => {
    songBpmRequestId += 1
    const requestId = songBpmRequestId
    if (!file) {
      songBpm.value = null
      songBpmStatus.value = 'idle'
      return
    }

    songBpmStatus.value = 'loading'
    songBpm.value = null

    try {
      const bpm = await extractBpmFromFile(file)
      if (requestId !== songBpmRequestId) return
      songBpm.value = bpm
      songBpmStatus.value = 'idle'
    } catch (err) {
      if (requestId !== songBpmRequestId) return
      console.error('Failed to estimate BPM', err)
      songBpm.value = null
      songBpmStatus.value = 'error'
    }
  })

  watch(
    () => videoGirlTag.value,
    () => {
      videoTagDraft.value = videoGirlTag.value
    },
    { immediate: true }
  )

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
      ranges.value.push({
        id,
        tag: `Range ${rangeCounter}`,
        start: lastEnd,
        end: nextEnd,
      })
    }
    rangeCounter += 1
  }

  function removeRange(id: string) {
    ranges.value = ranges.value.filter((range) => range.id !== id)
  }

  function applyVideoTag() {
    const nextValue = videoTagDraft.value.trim()
    if (!nextValue) return
    videoGirlTag.value = appendTag(videoGirlTag.value, nextValue)
    videoTagDraft.value = ''
  }

  function appendTag(current: string, nextValue: string) {
    const base = current.trim()
    if (!base) return nextValue
    return `${base}, ${nextValue}`
  }

  function parseTagList(value: string) {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  function stripExtension(filename: string) {
    const lastDot = filename.lastIndexOf('.')
    if (lastDot <= 0) return filename
    return filename.slice(0, lastDot)
  }

  function fileNameFromPath(value: string) {
    const normalized = value.replace(/\\/g, '/')
    const parts = normalized.split('/')
    return parts[parts.length - 1] || value
  }

  function joinPath(base: string, name: string) {
    const separator = base.includes('\\') ? '\\' : '/'
    const trimmed = base.endsWith('/') || base.endsWith('\\') ? base.slice(0, -1) : base
    return `${trimmed}${separator}${name}`
  }

  function sanitizeFilePart(value: string) {
    return value.replace(/[\\/:*?"<>|]/g, '').trim()
  }

  function buildOutputRangeName(range: { tag: string }, index: number) {
    const fallbackName = `Range ${index + 1}`
    const rangeName = sanitizeFilePart(range.tag || fallbackName) || fallbackName
    return rangeName
  }

  function buildOutputSegmentName(
    range: { tag: string },
    index: number,
    segmentIndex: number,
    totalSegments: number
  ) {
    const base = buildOutputRangeName(range, index)
    const width = Math.max(3, String(totalSegments).length)
    const suffix = String(segmentIndex + 1).padStart(width, '0')
    return `${base} - ${suffix}.mp4`
  }

  function getRangeSegmentCount(range: { start: number; end: number }) {
    const start = Math.max(0, range.start)
    const end = Math.max(start, range.end)
    const length = Math.max(1, segmentLength.value)
    return Math.max(1, Math.ceil((end - start) / length))
  }

  function buildRenderPlan() {
    const plan: Array<{
      filename: string
      start: number
      end: number
      range_id: string
      range_name: string
    }> = []

    ranges.value.forEach((range, index) => {
      const start = Math.max(0, range.start)
      const end = Math.max(start, range.end)
      const length = Math.max(1, segmentLength.value)
      const totalSegments = Math.max(1, Math.ceil((end - start) / length))

      const rangeName = buildOutputRangeName(range, index)
      for (let i = 0; i < totalSegments; i += 1) {
        const segmentStart = start + i * length
        const segmentEnd = Math.min(segmentStart + length, end)
        const filename = buildOutputSegmentName(range, index, i, totalSegments)
        plan.push({
          filename,
          start: segmentStart,
          end: segmentEnd,
          range_id: range.id,
          range_name: rangeName,
        })
      }
    })

    return plan
  }

  function buildRenderPlanForRange(index: number) {
    const range = ranges.value[index]
    if (!range) return []
    const start = Math.max(0, range.start)
    const end = Math.max(start, range.end)
    const length = Math.max(1, segmentLength.value)
    const totalSegments = Math.max(1, Math.ceil((end - start) / length))
    const rangeName = buildOutputRangeName(range, index)
    const plan: Array<{
      filename: string
      start: number
      end: number
      range_id: string
      range_name: string
    }> = []

    for (let i = 0; i < totalSegments; i += 1) {
      const segmentStart = start + i * length
      const segmentEnd = Math.min(segmentStart + length, end)
      const filename = buildOutputSegmentName(range, index, i, totalSegments)
      plan.push({
        filename,
        start: segmentStart,
        end: segmentEnd,
        range_id: range.id,
        range_name: rangeName,
      })
    }

    return plan
  }

  function buildSummaryItems(index?: number) {
    if (index !== undefined) {
      const range = ranges.value[index]
      if (!range) return []
      const start = Math.max(0, range.start)
      const end = Math.max(start, range.end)
      const fileCount = getRangeSegmentCount(range)
      return [
        {
          range_name: buildOutputRangeName(range, index),
          start,
          end,
          file_count: fileCount,
        },
      ]
    }

    return ranges.value.map((range, rangeIndex) => {
      const start = Math.max(0, range.start)
      const end = Math.max(start, range.end)
      return {
        range_name: buildOutputRangeName(range, rangeIndex),
        start,
        end,
        file_count: getRangeSegmentCount(range),
      }
    })
  }

  async function renderClips() {
    if (!canRender.value) return
    if (!exportDirectoryPath.value || !renderFolderName.value || !selectedFilePath.value) return

    try {
      renderMessage.value = 'Rendering...'
      const outputDir = joinPath(exportDirectoryPath.value, renderFolderName.value)
      const plan = buildRenderPlan()
      const summary = buildSummaryItems()

      if (!plan.length) {
        renderMessage.value = 'No clips to render.'
        return
      }

      await invoke('render_segments', {
        inputPath: selectedFilePath.value,
        outputDir,
        segments: plan,
        summary,
        summaryMode: 'overwrite',
      })

      renderMessage.value = `Rendered ${plan.length} clips.`
    } catch (err) {
      console.error('Render failed', err)
      renderMessage.value = 'Render failed. Check console.'
    }
  }

  async function renderRange(index: number) {
    if (!canRender.value) return
    if (!exportDirectoryPath.value || !renderFolderName.value || !selectedFilePath.value) return

    try {
      renderMessage.value = 'Rendering range...'
      const outputDir = joinPath(exportDirectoryPath.value, renderFolderName.value)
      const plan = buildRenderPlanForRange(index)
      const summary = buildSummaryItems(index)

      if (!plan.length) {
        renderMessage.value = 'No clips to render.'
        return
      }

      await invoke('render_segments', {
        inputPath: selectedFilePath.value,
        outputDir,
        segments: plan,
        summary,
        summaryMode: 'append',
      })

      renderMessage.value = `Rendered ${plan.length} clips.`
    } catch (err) {
      console.error('Render range failed', err)
      renderMessage.value = 'Render failed. Check console.'
    }
  }

  function serializeTagList(list: string[]) {
    return list.join(', ')
  }

  function removeTagAt(index: number) {
    const baseList = parseTagList(videoGirlTag.value)
    if (index < 0 || index >= baseList.length) return
    baseList.splice(index, 1)
    videoGirlTag.value = serializeTagList(baseList)
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

  function stepFrames(frameDelta: number) {
    const el = videoEl.value
    if (!el || duration.value <= 0) return
    const fps = 30
    const stepSeconds = (1 / fps) * frameDelta
    const nextTime = Math.min(Math.max(el.currentTime + stepSeconds, 0), duration.value)
    el.currentTime = nextTime
    currentTime.value = nextTime
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

  async function extractBpmFromFile(file: File) {
    const audioContext = new AudioContext()
    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
      return estimateBpmFromAudioBuffer(audioBuffer)
    } finally {
      await audioContext.close()
    }
  }

  function estimateBpmFromAudioBuffer(buffer: AudioBuffer) {
    const maxSeconds = 90
    const maxSamples = Math.min(buffer.length, Math.floor(buffer.sampleRate * maxSeconds))
    const channelCount = buffer.numberOfChannels
    const mono = new Float32Array(maxSamples)

    for (let channel = 0; channel < channelCount; channel += 1) {
      const data = buffer.getChannelData(channel)
      if (!data || !mono) continue
      for (let i = 0; i < maxSamples; i += 1) {
        if (typeof mono[i] === 'undefined' || typeof data[i] === 'undefined') continue
        mono[i] = Number(mono[i]) + Number(data[i]) / channelCount
      }
    }

    const envelopeRate = 200
    const step = Math.max(1, Math.floor(buffer.sampleRate / envelopeRate))
    const envelopeLength = Math.floor(maxSamples / step)
    const envelope = new Float32Array(envelopeLength)

    for (let i = 0; i < envelopeLength; i += 1) {
      if (typeof envelope[i] === 'undefined') continue
      let sum = 0
      const offset = i * step
      for (let j = 0; j < step; j += 1) {
        const sample = mono[offset + j] || 0
        sum += sample * sample
      }
      envelope[i] = Math.sqrt(sum / step)
    }

    let mean = 0
    for (let i = 0; i < envelopeLength; i += 1) {
      if (typeof envelope[i] === 'undefined') continue
      mean += Number(envelope[i])
    }
    mean /= Math.max(1, envelopeLength)

    for (let i = 0; i < envelopeLength; i += 1) {
      if (typeof envelope[i] === 'undefined') continue
      envelope[i] = Number(envelope[i]) - mean
    }

    const minBpm = 60
    const maxBpm = 200
    const sampleRate = envelopeRate
    let bestBpm = minBpm
    let bestScore = -Infinity

    for (let bpm = minBpm; bpm <= maxBpm; bpm += 1) {
      const lag = Math.round((sampleRate * 60) / bpm)
      if (lag <= 0 || lag >= envelopeLength) continue

      let score = 0
      for (let i = 0; i < envelopeLength - lag; i += 1) {
        if (typeof envelope[i] === 'undefined' || typeof envelope[i + lag] === 'undefined') continue
        score += Number(envelope[i]) * Number(envelope[i + lag])
      }

      if (score > bestScore) {
        bestScore = score
        bestBpm = bpm
      }
    }

    return bestBpm
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
    overflow: hidden;
  }

  .panel-block {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 0;
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
    flex-grow: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none; /* Firefox */
  }
  .range-list::-webkit-scrollbar {
    display: none;
  }
  .scrollable-range-list {
    flex-grow: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .scrollable-range-list::-webkit-scrollbar {
    display: none;
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

  .tag-input {
    width: 100%;
    height: 36px;
    padding: 0.55rem 0.75rem;
    background: rgba(15, 23, 42, 0.75);
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 10px;
    color: #e5e7eb;
    font-size: 0.9rem;
  }

  .tag-input:focus {
    outline: 2px solid rgba(99, 102, 241, 0.45);
    border-color: transparent;
  }

  .range-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex-grow: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none; /* Firefox */
  }
  .range-list::-webkit-scrollbar {
    display: none;
  }
  .scrollable-range-list {
    flex-grow: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .scrollable-range-list::-webkit-scrollbar {
    display: none;
  }
  .tag-item {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
    background: rgba(99, 102, 241, 0.18);
    border: 1px solid rgba(99, 102, 241, 0.35);
    color: #e0e7ff;
    cursor: pointer;
    line-height: 1.2;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease;
  }

  .tag-item:hover {
    background: rgba(99, 102, 241, 0.3);
    border-color: rgba(129, 140, 248, 0.75);
    transform: translateY(-1px);
  }

  .render-preview {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .render-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .render-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    border-radius: 8px;
    background: rgba(12, 18, 30, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #cbd5f5;
    font-size: 0.78rem;
  }

  .render-name {
    color: #e5e7eb;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .render-count {
    color: #a5b4fc;
    font-weight: 600;
    white-space: nowrap;
  }
</style>
