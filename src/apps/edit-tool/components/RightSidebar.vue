<template>
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
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import {
    canEditRanges,
    canRender,
    exportDirectoryPath,
    ranges,
    renderFolderName,
    renderMessage,
    segmentLength,
    selectedFilePath,
    videoGirlTag,
  } from '../../../shared/composables/useEditingState'
  import {
    buildOutputRangeName,
    buildOutputSegmentName,
    buildSummaryItems,
    joinPath,
    getRangeSegmentCount,
    parseTagList,
  } from '../../../shared/utils/editingUtils'
  import { invoke } from '@tauri-apps/api/core'

  const videoTagDraft = ref('')

  const currentTagList = computed(() => {
    return parseTagList(videoGirlTag.value)
  })
  const selectedRangeOutputName = computed(() => {
    const previewRange = ranges.value[0]
    if (!previewRange) return ''
    const totalSegments = getRangeSegmentCount(previewRange)
    return buildOutputSegmentName(previewRange, 0, 0, totalSegments)
  })
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

  function appendTag(current: string, nextValue: string) {
    const base = current.trim()
    if (!base) return nextValue
    return `${base}, ${nextValue}`
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

  function applyVideoTag() {
    const nextValue = videoTagDraft.value.trim()
    if (!nextValue) return
    videoGirlTag.value = appendTag(videoGirlTag.value, nextValue)
    videoTagDraft.value = ''
  }

  function removeTagAt(index: number) {
    const baseList = parseTagList(videoGirlTag.value)
    if (index < 0 || index >= baseList.length) return
    baseList.splice(index, 1)
    videoGirlTag.value = serializeTagList(baseList)
  }

  function serializeTagList(list: string[]) {
    return list.join(', ')
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

  watch(
    () => videoGirlTag.value,
    () => {
      videoTagDraft.value = videoGirlTag.value
    },
    { immediate: true }
  )
</script>

<style src="../views/RightSidebar.css"></style>
