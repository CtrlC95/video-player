<template>
  <aside class="sidebar left">
    <div class="sidebar-content">
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
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { computed, watch } from 'vue'
  import { open as openDialog } from '@tauri-apps/plugin-dialog'
  import { convertFileSrc, invoke } from '@tauri-apps/api/core'
  import { open as openFile } from '@tauri-apps/plugin-fs'
  import {
    canEditRanges,
    canRender,
    currentTime,
    duration,
    exportDirectoryPath,
    exportPath,
    ranges,
    renderFolderName,
    renderMessage,
    segmentLength,
    selectedFileName,
    selectedFilePath,
    selectedSongFile,
    songBpm,
    songBpmStatus,
    videoUrl,
  } from '../../../shared/composables/useEditingState'
  import {
    buildOutputRangeName,
    buildOutputSegmentName,
    buildSummaryItems,
    formatTime,
    joinPath,
  } from '../../../shared/utils/editingUtils'

  let songBpmRequestId = 0
  let rangeCounter = 1

  const songBpsLabel = computed(() => {
    if (songBpmStatus.value === 'loading') return '...'
    if (songBpmStatus.value === 'error') return 'error'
    if (songBpm.value === null) return '--'
    return (songBpm.value / 60).toFixed(2)
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

  function fileNameFromPath(value: string) {
    const normalized = value.replace(/\\/g, '/')
    const parts = normalized.split('/')
    return parts[parts.length - 1] || value
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

  async function selectVideoFile() {
    console.log('selectVideoFile called')
    const selected = await openDialog({
      multiple: false,
      directory: false,
      filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'] }],
    })

    if (!selected || Array.isArray(selected)) {
      console.log('No file selected or multiple files selected', selected)
      return
    }
    console.log('File selected:', selected)
    selectedFilePath.value = selected
    selectedFileName.value = fileNameFromPath(selected)
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

  watch(selectedFilePath, async (path) => {
    console.log('selectedFilePath watcher triggered, path:', path)
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
      // Log reactivity check
      setTimeout(() => {
        console.log('Reactive videoUrl after set:', videoUrl.value)
        const video = document.querySelector('video.edit-video') as HTMLVideoElement | null
        if (video) {
          console.log('Video element src:', video.src)
        } else {
          console.log('No video element found')
        }
      }, 100)
    } else {
      videoUrl.value = ''
    }
  })

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
</script>

<style src="../views/EditLeftSidebar.css"></style>
