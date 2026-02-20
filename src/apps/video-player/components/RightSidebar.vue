<template>
  <aside class="sidebar right hidden">
    <div class="sidebar-content">
      <div class="panel-block">
        <p class="panel-label">Pick Probability</p>
        <p class="panel-value">{{ pickProbabilityLabel }}</p>
      </div>
      <div class="panel-block">
        <p class="panel-label">Themes</p>
        <div v-if="currentThemes.length" class="tag-list tag-list-sidebar">
          <span
            v-for="theme in currentThemes"
            :key="theme"
            class="tag-selected tag-selected-static"
          >
            {{ theme }}
          </span>
        </div>
        <p v-else class="panel-value">—</p>
      </div>
      <div class="panel-block">
        <p class="panel-label">Girls</p>
        <div v-if="currentGirls.length" class="tag-list tag-list-sidebar">
          <span v-for="girl in currentGirls" :key="girl" class="tag-selected tag-selected-static">
            {{ girl }}
          </span>
        </div>
        <p v-else class="panel-value">—</p>
      </div>
      <div class="panel-block">
        <p class="panel-label">Delete</p>
        <div class="radio-group">
          <label class="radio-option">
            <input
              type="radio"
              name="delete-flag"
              value="no"
              :checked="pendingDelete === 'no'"
              @change="pendingDelete = 'no'"
            />
            No
          </label>
          <label class="radio-option">
            <input
              type="radio"
              name="delete-flag"
              value="yes"
              :checked="pendingDelete === 'yes'"
              @change="pendingDelete = 'yes'"
            />
            Yes
          </label>
        </div>
      </div>
      <div class="panel-block">
        <p class="panel-label">Edit Video</p>
        <div class="option-chips">
          <button
            v-for="option in editOptions"
            :key="option"
            class="option-chip"
            :class="{ active: isOptionSelected(pendingEditOptions, option) }"
            @click="toggleOption('edit', option)"
          >
            {{ option }}
          </button>
        </div>
      </div>
      <div class="panel-block">
        <p class="panel-label">Update Song Tags</p>
        <div class="tag-update-rows">
          <div class="tag-update-row">
            <button
              class="option-chip"
              :class="{
                active: updateFormOptions[0]
                  ? isOptionSelected(pendingUpdateFormOptions, updateFormOptions[0]!)
                  : false,
              }"
              @click="updateFormOptions[0] && toggleOption('updateForm', updateFormOptions[0]!)"
            >
              {{ updateFormOptions[0] }}
            </button>
            <input
              v-model="pendingUpdateGirls"
              class="sidebar-input"
              type="text"
              placeholder="girl1, girl2"
            />
          </div>
          <div class="tag-update-row">
            <button
              class="option-chip"
              :class="{
                active: updateFormOptions[1]
                  ? isOptionSelected(pendingUpdateFormOptions, updateFormOptions[1]!)
                  : false,
              }"
              @click="updateFormOptions[1] && toggleOption('updateForm', updateFormOptions[1]!)"
            >
              {{ updateFormOptions[1] }}
            </button>
            <input
              v-model="pendingUpdateThemes"
              class="sidebar-input"
              type="text"
              placeholder="theme1, theme2"
            />
          </div>
        </div>
      </div>
      <div class="panel-block">
        <button
          class="btn-secondary"
          :class="{ active: hasPendingFormChanges }"
          :disabled="!selectedVideo || !hasPendingFormChanges"
          @click="applyFormChanges"
        >
          Update Form
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { computed, watch } from 'vue'
  import {
    lastPickProbability,
    pendingDelete,
    pendingEditOptions,
    pendingUpdateFormOptions,
    pendingUpdateGirls,
    pendingUpdateThemes,
    selectedVideo,
    videosInDatabase,
  } from '../../../shared/composables/useVideoplayerState'
  import { parseMultiOption } from '../../../shared/utils/videoPlayerUtils'
  import { videoDataService } from '../../../shared/services/videoDataService'
  import { selectedVideoName } from '../../../shared/state/videoSelection'

  const editOptions = ['Fluff beginning', 'Fluff end', 'Multiple songs']
  const updateFormOptions = ['Check girls', 'Check themes']

  const currentThemes = computed(() => parseTagList(selectedVideo.value?.theme))
  const currentGirls = computed(() => parseTagList(selectedVideo.value?.mainGirl))
  const pickProbabilityLabel = computed(() => {
    if (!selectedVideo.value || videosInDatabase.value.length === 0) return '—'
    const selectedWeight = Math.max(1, selectedVideo.value.weightScore || 1)
    const weights = videosInDatabase.value.map((v) => Math.max(1, v.weightScore || 1))
    if (weights.length === 0) return `Song: ${selectedWeight} · Mean: —`
    const sorted = [...weights].sort((a, b) => b - a)
    const cutoff = Math.ceil(sorted.length * 0.75)
    const topWeights = sorted.slice(0, cutoff)
    const meanWeight = topWeights.reduce((sum, w) => sum + w, 0) / topWeights.length
    return `Song: ${selectedWeight} · Mean: ${meanWeight.toFixed(2)}`
  })
  const hasPendingFormChanges = computed(() => {
    if (!selectedVideo.value) return false
    const currentDeleteValue = selectedVideo.value.delete ?? 'no'
    const deleteChanged = pendingDelete.value !== currentDeleteValue
    const editChanged =
      normalizePending(pendingEditOptions.value) !== normalizeMultiValue(selectedVideo.value.edit)
    const updateChanged =
      normalizePending(pendingUpdateFormOptions.value) !==
      normalizeMultiValue(selectedVideo.value.updateForm)
    const girlsChanged = pendingUpdateGirls.value !== (selectedVideo.value.updateFormGirls ?? '')
    const themesChanged = pendingUpdateThemes.value !== (selectedVideo.value.updateFormThemes ?? '')
    return deleteChanged || editChanged || updateChanged || girlsChanged || themesChanged
  })

  function parseTagList(value?: string[] | string) {
    if (!value) return []
    if (Array.isArray(value)) {
      return value.map((item) => item.trim()).filter((item) => item)
    }
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item)
  }

  function isOptionSelected(list: string[], option: string) {
    return list.some((item) => item.toLowerCase() === option.toLowerCase())
  }

  function toggleOption(field: 'edit' | 'updateForm', option: string) {
    const target = field === 'edit' ? pendingEditOptions : pendingUpdateFormOptions
    const lower = option.toLowerCase()
    const exists = target.value.some((item) => item.toLowerCase() === lower)
    target.value = exists
      ? target.value.filter((item) => item.toLowerCase() !== lower)
      : [...target.value, option]
  }

  function applyFormChanges() {
    if (!selectedVideo.value) return
    const target = selectedVideo.value
    target.delete = pendingDelete.value
    target.edit = pendingEditOptions.value.join(', ')
    target.updateForm = pendingUpdateFormOptions.value.join(', ')
    target.updateFormGirls = pendingUpdateGirls.value
    target.updateFormThemes = pendingUpdateThemes.value

    const updated = videosInDatabase.value.map((video) => {
      if (video.fileName !== target.fileName) return video
      return target
    })
    videosInDatabase.value = updated
    videoDataService.saveVideos(updated)
  }

  function normalizeMultiValue(value?: string) {
    return parseMultiOption(value)
      .map((item) => item.toLowerCase())
      .sort()
      .join(',')
  }

  function normalizePending(values: string[]) {
    return values
      .map((item) => item.trim())
      .filter((item) => item)
      .map((item) => item.toLowerCase())
      .sort()
      .join(',')
  }

  watch(
    selectedVideo,
    (video) => {
      if (!video) {
        pendingDelete.value = 'no'
        pendingEditOptions.value = []
        pendingUpdateFormOptions.value = []
        pendingUpdateGirls.value = ''
        pendingUpdateThemes.value = ''
        return
      }
      pendingDelete.value = video.delete ?? 'no'
      pendingEditOptions.value = parseMultiOption(video.edit)
      pendingUpdateFormOptions.value = parseMultiOption(video.updateForm)
      pendingUpdateGirls.value = video.updateFormGirls ?? ''
      pendingUpdateThemes.value = video.updateFormThemes ?? ''
    },
    { immediate: true }
  )

  watch(
    [selectedVideoName, videosInDatabase],
    ([name, videos]) => {
      if (!name || !videos.length) return
      if (selectedVideo.value?.fileName === name) return
      const match = videos.find((v) => v.fileName === name)
      if (match) {
        selectedVideo.value = match
        if (lastPickProbability.value === null) {
          lastPickProbability.value = 1 / videos.length
        }
      }
    },
    { immediate: true }
  )
</script>

<style src="../views/RightSidebar.css"></style>
