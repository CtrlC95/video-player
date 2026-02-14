import { useVideoFileBrowser } from '../composables/useFileBrowser'
import {
  audioContext,
  currentTime,
  duration,
  girlMatchMode,
  isMuted,
  isPlaying,
  lastPickProbability,
  lastWeightedCandidates,
  lastWeightedPick,
  nextShuffleVideo,
  onlyNoGirls,
  onlyNoThemes,
  playMode,
  queuedVideos,
  selectedGirls,
  selectedTags,
  selectedVideo,
  shuffleHistory,
  suppressHistoryOnce,
  tagMatchMode,
  videoEl,
  videoHeight,
  videosInDatabase,
  videoSrc,
  videoWidth,
  volume,
} from '../composables/useVideoplayerState'
import { selectedVideoName } from '../state/videoSelection'
import { nextTick, ref } from 'vue'
import type { VideoMetadata } from '../types/media'

const audioSource = ref<MediaElementAudioSourceNode | null>(null)
const gainNode = ref<GainNode | null>(null)
let currentObjectUrl: string | null = null

const { directoryHandle } = useVideoFileBrowser()

export function normalizeList(value?: string[] | string) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export function matchesGirlFilter(girlsLower: string[], selectedLower: string[]) {
  if (onlyNoGirls.value) return girlsLower.length === 0
  return matchesSelection(girlsLower, selectedLower, girlMatchMode.value)
}

export function matchesThemeFilter(themesLower: string[], selectedLower: string[]) {
  if (onlyNoThemes.value) return themesLower.length === 0
  return matchesSelection(themesLower, selectedLower, tagMatchMode.value)
}

export async function playVideoNow(video: VideoMetadata) {
  selectedVideo.value = video
  selectedVideoName.value = video.fileName
  lastWeightedPick.value = null
  lastWeightedCandidates.value = []
  await loadSelectedVideo(true)
}

export async function playNext() {
  if (selectedVideo.value) {
    shuffleHistory.value = [selectedVideo.value, ...shuffleHistory.value]
    suppressHistoryOnce.value = true
  }
  if (queuedVideos.value.length > 0) {
    const nextQueued = queuedVideos.value[0]
    queuedVideos.value = queuedVideos.value.slice(1)
    if (nextQueued) {
      await playVideoNow(nextQueued)
    }
    return
  }
  if (playMode.value === 'shuffle') {
    if (nextShuffleVideo.value) {
      const candidates = getShuffleCandidates('shuffle', selectedVideo.value?.fileName)
      const picked = nextShuffleVideo.value
      if (picked) {
        selectedVideo.value = picked
        selectedVideoName.value = picked.fileName
        const weights = candidates.map((v) => Math.max(1, v.weightScore || 1))
        const totalWeight = weights.reduce((sum, w) => sum + w, 0)
        const pickedIndex = candidates.findIndex((v) => v.fileName === picked.fileName)
        lastPickProbability.value =
          pickedIndex >= 0 && totalWeight > 0 && weights[pickedIndex] !== undefined
            ? weights[pickedIndex] / totalWeight
            : null
        lastWeightedPick.value = picked
        lastWeightedCandidates.value = candidates
      } else {
        pickRandomVideo()
      }
    } else {
      pickRandomVideo()
    }
  } else if (playMode.value === 'shuffle-tags') {
    const currentName = selectedVideo.value?.fileName
    const candidates = getShuffleCandidates('shuffle-tags', currentName)
    if (nextShuffleVideo.value && candidates.length) {
      const picked = nextShuffleVideo.value
      const pickedIndex = candidates.findIndex((v) => v.fileName === picked.fileName)
      if (picked && pickedIndex >= 0) {
        selectedVideo.value = picked
        selectedVideoName.value = picked.fileName
        const weights = candidates.map((v) => Math.max(1, v.weightScore || 1))
        const totalWeight = weights.reduce((sum, w) => sum + w, 0)
        lastPickProbability.value =
          pickedIndex >= 0 && totalWeight > 0 && weights[pickedIndex] !== undefined
            ? weights[pickedIndex] / totalWeight
            : null
        lastWeightedPick.value = picked
        lastWeightedCandidates.value = candidates
      } else {
        pickRandomByTags()
        await loadSelectedVideo(true)
        return
      }
    } else {
      pickRandomByTags()
    }
  } else {
    pickNextSequential()
  }

  await loadSelectedVideo(true)
}

export function pickRandomByTags() {
  if (videosInDatabase.value.length === 0) {
    selectedVideo.value = null
    selectedVideoName.value = null
    lastPickProbability.value = null
    return
  }

  if (
    selectedTags.value.length === 0 &&
    selectedGirls.value.length === 0 &&
    !onlyNoThemes.value &&
    !onlyNoGirls.value
  ) {
    pickRandomVideo()
    return
  }

  const current = selectedVideo.value

  const candidates = getShuffleCandidates('shuffle-tags', current?.fileName)

  if (candidates.length === 0) {
    pickRandomVideo()
    return
  }

  const selection = weightedPick(candidates)
  if (!selection) {
    pickRandomVideo()
    return
  }

  if (selection.picked) {
    selectedVideo.value = selection.picked
    selectedVideoName.value = selection.picked.fileName
    lastPickProbability.value =
      selection.totalWeight > 0 &&
      Array.isArray(selection.weights) &&
      typeof selection.pickedIndex === 'number'
        ? (selection.weights?.[selection.pickedIndex] ?? 1) / selection.totalWeight
        : null
    lastWeightedPick.value = selection.picked
    lastWeightedCandidates.value = candidates
  } else {
    selectedVideo.value = null
    selectedVideoName.value = null
    lastPickProbability.value = null
    lastWeightedPick.value = null
    lastWeightedCandidates.value = []
  }
}

export function weightedPick(candidates: VideoMetadata[]) {
  if (!candidates.length) return null
  const weights = candidates.map((v) => Math.max(1, v.weightScore || 1))
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let roll = Math.random() * totalWeight
  let pickedIndex = 0
  for (let i = 0; i < candidates.length; i += 1) {
    roll -= weights[i] ?? 0
    if (roll <= 0) {
      pickedIndex = i
      break
    }
  }
  return {
    picked: candidates[pickedIndex],
    weights,
    totalWeight,
    pickedIndex,
  }
}

export async function loadSelectedVideo(autoPlay = true) {
  if (!selectedVideo.value || !directoryHandle.value) return

  try {
    const handle = await directoryHandle.value.getFileHandle(selectedVideo.value.fileName)
    const file = await handle.getFile()

    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
    }

    currentObjectUrl = URL.createObjectURL(file)
    videoSrc.value = currentObjectUrl

    currentTime.value = 0
    duration.value = 0
    videoWidth.value = 0
    videoHeight.value = 0

    await nextTick()
    isPlaying.value = false
    if (videoEl.value) {
      ensureAudioPipeline(videoEl.value)
      applyGain()
    }
    if (autoPlay && videoEl.value) {
      try {
        await videoEl.value.play()
      } catch {
        // ignore autoplay restrictions
      }
    }
  } catch (err) {
    console.error('Failed to load selected video', err)
    videoSrc.value = ''
  }
}

export function applyGain() {
  if (!videoEl.value) return
  ensureAudioPipeline(videoEl.value)
  if (gainNode.value) {
    gainNode.value.gain.value = isMuted.value ? 0 : volume.value
  }
}

export function ensureAudioPipeline(el: HTMLVideoElement) {
  if (audioContext.value && audioSource.value && gainNode.value) return
  const context = new AudioContext()
  const source = context.createMediaElementSource(el)
  const gain = context.createGain()
  source.connect(gain).connect(context.destination)
  audioContext.value = context
  audioSource.value = source
  gainNode.value = gain
}

export function pickRandomVideo() {
  if (videosInDatabase.value.length === 0) {
    selectedVideo.value = null
    selectedVideoName.value = null
    lastPickProbability.value = null
    return
  }
  const candidates = videosInDatabase.value
  const selection = weightedPick(candidates)
  if (!selection) {
    selectedVideo.value = null
    selectedVideoName.value = null
    lastPickProbability.value = null
    return
  }
  if (selection.picked) {
    selectedVideo.value = selection.picked
    selectedVideoName.value = selection.picked.fileName
    lastPickProbability.value =
      selection.totalWeight > 0 &&
      Array.isArray(selection.weights) &&
      typeof selection.pickedIndex === 'number'
        ? (selection.weights?.[selection.pickedIndex] ?? 1) / selection.totalWeight
        : null
    lastWeightedPick.value = selection.picked
    lastWeightedCandidates.value = candidates
  } else {
    selectedVideo.value = null
    selectedVideoName.value = null
    lastPickProbability.value = null
    lastWeightedPick.value = null
    lastWeightedCandidates.value = []
  }
}

export function getShuffleCandidates(mode: 'shuffle' | 'shuffle-tags', currentFileName?: string) {
  if (mode === 'shuffle') {
    return videosInDatabase.value.filter((v) => v.fileName !== currentFileName)
  }

  const selectedThemesLower = selectedTags.value.map((t) => t.toLowerCase())
  const selectedGirlsLower = selectedGirls.value.map((g) => g.toLowerCase())
  return videosInDatabase.value.filter((v) => {
    if (currentFileName && v.fileName === currentFileName) return false
    const themesLower = normalizeList(v.theme).map((t) => t.toLowerCase())
    const girlsLower = normalizeList(v.mainGirl).map((g) => g.toLowerCase())
    const matchesThemes = matchesThemeFilter(themesLower, selectedThemesLower)
    const matchesGirls = matchesGirlFilter(girlsLower, selectedGirlsLower)
    return matchesThemes && matchesGirls
  })
}

export function parseMultiOption(value?: string) {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item)
}
function pickNextSequential() {
  if (videosInDatabase.value.length === 0) {
    selectedVideo.value = null
    selectedVideoName.value = null
    lastPickProbability.value = null
    return
  }

  if (!selectedVideo.value) {
    selectedVideo.value = videosInDatabase.value[0] ?? null
    if (selectedVideo.value) {
      selectedVideoName.value = selectedVideo.value.fileName
      lastPickProbability.value = 1 / videosInDatabase.value.length
    }
    return
  }

  const currentIndex = videosInDatabase.value.findIndex(
    (v) => v.fileName === selectedVideo.value?.fileName
  )
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % videosInDatabase.value.length : 0
  selectedVideo.value = videosInDatabase.value[nextIndex] ?? null
  if (selectedVideo.value) {
    selectedVideoName.value = selectedVideo.value.fileName
    lastPickProbability.value = 1 / videosInDatabase.value.length
  }
}

function matchesSelection(itemsLower: string[], selectedLower: string[], mode: 'any' | 'all') {
  if (selectedLower.length === 0) return true
  if (mode === 'all') {
    return selectedLower.every((tag) => itemsLower.includes(tag))
  }
  return selectedLower.some((tag) => itemsLower.includes(tag))
}
