<template>
  <div class="video-player-app">
    <main class="player-main">
      <div class="player-stage" @wheel.prevent="handleVolumeWheel">
        <aside class="left-sidebar">
          <div class="sidebar-content">
            <button class="btn-select" @click="selectDirectory">
              {{ currentPath ? 'Change Directory' : 'Select Directory' }}
            </button>
            <template v-if="currentPath">
              <button
                class="btn-secondary"
                :class="{ active: playMode === 'shuffle' }"
                @click="playMode = 'shuffle'"
              >
                Shuffle
              </button>
              <button
                class="btn-secondary"
                :class="{ active: playMode === 'shuffle-tags' }"
                @click="playMode = 'shuffle-tags'"
              >
                Shuffle with tags
              </button>
              <button
                class="btn-secondary"
                :class="{ active: playMode === 'search' }"
                @click="playMode = 'search'"
              >
                Search
              </button>

              <template v-if="playMode === 'shuffle'">
                <div class="panel-block">
                  <p class="panel-label">Playlist</p>
                  <div class="history-list" ref="historyListEl">
                    <div
                      v-for="(video, index) in queuedVideosReversed"
                      :key="`shuffle-queued-${video.fileName}-${index}`"
                      :class="[
                        'history-item',
                        'history-item-upcoming',
                        { 'history-item-remove': hoveredQueueIndex === index },
                      ]"
                      @mouseenter="handleQueuedHover(index)"
                      @mouseleave="clearQueuedHover"
                      @click="handleQueuedClick(video, index)"
                    >
                      <span class="search-result-title">{{ formatVideoTitle(video) }}</span>
                      <span class="search-result-meta">
                        {{
                          hoveredQueueIndex === index
                            ? 'Click to remove from queue'
                            : formatVideoMeta(video)
                        }}
                      </span>
                    </div>
                    <div
                      v-if="!queuedVideos.length"
                      class="history-item history-item-next"
                      @click="handleShuffleNextClick"
                    >
                      <span class="search-result-title">{{ shuffleNextTitle }}</span>
                      <span class="search-result-meta">{{ shuffleNextMeta }}</span>
                    </div>
                    <div class="history-item history-item-current">
                      <span class="search-result-title">{{ shuffleNowTitle }}</span>
                      <span class="search-result-meta">{{ shuffleNowMeta }}</span>
                    </div>
                    <div
                      v-for="(video, index) in shuffleHistory"
                      :key="`${video.fileName}-${index}`"
                      class="history-item history-item-previous"
                      @click="handleShuffleHistoryClick(video)"
                    >
                      <span class="search-result-title">{{ formatVideoTitle(video) }}</span>
                      <span class="search-result-meta">{{ formatVideoMeta(video) }}</span>
                    </div>
                    <p v-if="!shuffleHistory.length" class="search-empty">No songs yet.</p>
                  </div>
                </div>
              </template>

              <template v-if="playMode === 'shuffle-tags'">
                <div class="panel-block">
                  <p class="panel-label">Themes</p>
                  <div class="tag-mode">
                    <button
                      class="btn-secondary"
                      :class="{ active: tagMatchMode === 'any' }"
                      @click="tagMatchMode = 'any'"
                    >
                      Or
                    </button>
                    <button
                      class="btn-secondary"
                      :class="{ active: tagMatchMode === 'all' }"
                      @click="tagMatchMode = 'all'"
                    >
                      And
                    </button>
                  </div>
                  <div class="tag-search">
                    <input
                      v-model="tagSearch"
                      type="text"
                      class="tag-search-input"
                      placeholder="Search themes..."
                      @focus="isTagSearchFocused = true"
                      @blur="handleTagSearchBlur"
                    />
                    <div v-if="isTagSearchFocused && filteredTags.length" class="tag-dropdown">
                      <button
                        v-for="item in filteredTags"
                        :key="item.key"
                        class="tag-option"
                        @click="handleTagOption(item)"
                      >
                        {{ item.label }}
                      </button>
                    </div>
                  </div>

                  <div class="tag-list">
                    <button v-if="onlyNoThemes" class="tag-selected" @click="onlyNoThemes = false">
                      No themes
                    </button>
                    <button
                      v-for="tag in selectedTags"
                      :key="tag"
                      class="tag-selected"
                      @click="removeTag(tag)"
                    >
                      {{ tag }}
                    </button>
                  </div>
                </div>

                <div class="panel-block">
                  <p class="panel-label">Girls</p>
                  <div class="tag-mode">
                    <button
                      class="btn-secondary"
                      :class="{ active: girlMatchMode === 'any' }"
                      @click="girlMatchMode = 'any'"
                    >
                      Or
                    </button>
                    <button
                      class="btn-secondary"
                      :class="{ active: girlMatchMode === 'all' }"
                      @click="girlMatchMode = 'all'"
                    >
                      And
                    </button>
                  </div>
                  <div class="tag-search">
                    <input
                      v-model="girlSearch"
                      type="text"
                      class="tag-search-input"
                      placeholder="Search girls..."
                      @focus="isGirlSearchFocused = true"
                      @blur="handleGirlSearchBlur"
                    />
                    <div v-if="isGirlSearchFocused && filteredGirls.length" class="tag-dropdown">
                      <button
                        v-for="item in filteredGirls"
                        :key="item.key"
                        class="tag-option"
                        @click="handleGirlOption(item)"
                      >
                        {{ item.label }}
                      </button>
                    </div>
                  </div>

                  <div class="tag-list">
                    <button v-if="onlyNoGirls" class="tag-selected" @click="onlyNoGirls = false">
                      No girls
                    </button>
                    <button
                      v-for="girl in selectedGirls"
                      :key="girl"
                      class="tag-selected"
                      @click="removeGirl(girl)"
                    >
                      {{ girl }}
                    </button>
                  </div>
                </div>

                <div class="panel-block">
                  <p class="panel-label">Playlist</p>
                  <div class="history-list" ref="historyListEl">
                    <div
                      v-for="(video, index) in queuedVideosReversed"
                      :key="`shuffle-tags-queued-${video.fileName}-${index}`"
                      :class="[
                        'history-item',
                        'history-item-upcoming',
                        { 'history-item-remove': hoveredQueueIndex === index },
                      ]"
                      @mouseenter="handleQueuedHover(index)"
                      @mouseleave="clearQueuedHover"
                      @click="handleQueuedClick(video, index)"
                    >
                      <span class="search-result-title">{{ formatVideoTitle(video) }}</span>
                      <span class="search-result-meta">
                        {{
                          hoveredQueueIndex === index
                            ? 'Click to remove from queue'
                            : formatVideoMeta(video)
                        }}
                      </span>
                    </div>
                    <div
                      v-if="!queuedVideos.length"
                      class="history-item history-item-next"
                      @click="handleShuffleNextClick"
                    >
                      <span class="search-result-title">{{ shuffleNextTitle }}</span>
                      <span class="search-result-meta">{{ shuffleNextMeta }}</span>
                    </div>
                    <div class="history-item history-item-current">
                      <span class="search-result-title">{{ shuffleNowTitle }}</span>
                      <span class="search-result-meta">{{ shuffleNowMeta }}</span>
                    </div>
                    <div
                      v-for="(video, index) in shuffleHistory"
                      :key="`${video.fileName}-${index}`"
                      class="history-item history-item-previous"
                      @click="handleShuffleHistoryClick(video)"
                    >
                      <span class="search-result-title">{{ formatVideoTitle(video) }}</span>
                      <span class="search-result-meta">{{ formatVideoMeta(video) }}</span>
                    </div>
                    <p v-if="!shuffleHistory.length" class="search-empty">No songs yet.</p>
                  </div>
                </div>
              </template>

              <template v-if="playMode === 'search'">
                <div class="panel-block">
                  <p class="panel-label">Song</p>
                  <div class="tag-search">
                    <input
                      v-model="songSearch"
                      type="text"
                      class="tag-search-input"
                      placeholder="Search songs..."
                      @focus="isSongSearchFocused = true"
                      @blur="handleSongSearchBlur"
                    />
                    <div v-if="isSongSearchFocused && filteredSongs.length" class="tag-dropdown">
                      <button
                        v-for="item in filteredSongs"
                        :key="item.key"
                        class="tag-option"
                        @click="selectSong(item.value)"
                      >
                        {{ item.label }}
                      </button>
                    </div>
                  </div>

                  <div class="tag-list">
                    <button v-if="selectedSong" class="tag-selected" @click="selectedSong = null">
                      {{ selectedSong }}
                    </button>
                  </div>
                </div>

                <div class="panel-block">
                  <p class="panel-label">Artist</p>
                  <div class="tag-search">
                    <input
                      v-model="artistSearch"
                      type="text"
                      class="tag-search-input"
                      placeholder="Search artists..."
                      @focus="isArtistSearchFocused = true"
                      @blur="handleArtistSearchBlur"
                    />
                    <div
                      v-if="isArtistSearchFocused && filteredArtists.length"
                      class="tag-dropdown"
                    >
                      <button
                        v-for="item in filteredArtists"
                        :key="item.key"
                        class="tag-option"
                        @click="selectArtist(item.value)"
                      >
                        {{ item.label }}
                      </button>
                    </div>
                  </div>

                  <div class="tag-list">
                    <button
                      v-if="selectedArtist"
                      class="tag-selected"
                      @click="selectedArtist = null"
                    >
                      {{ selectedArtist }}
                    </button>
                  </div>
                </div>

                <div class="panel-block">
                  <p class="panel-label">Creator</p>
                  <div class="tag-search">
                    <input
                      v-model="creatorSearch"
                      type="text"
                      class="tag-search-input"
                      placeholder="Search creators..."
                      @focus="isCreatorSearchFocused = true"
                      @blur="handleCreatorSearchBlur"
                    />
                    <div
                      v-if="isCreatorSearchFocused && filteredCreators.length"
                      class="tag-dropdown"
                    >
                      <button
                        v-for="item in filteredCreators"
                        :key="item.key"
                        class="tag-option"
                        @click="selectCreator(item.value)"
                      >
                        {{ item.label }}
                      </button>
                    </div>
                  </div>

                  <div class="tag-list">
                    <button
                      v-if="selectedCreator"
                      class="tag-selected"
                      @click="selectedCreator = null"
                    >
                      {{ selectedCreator }}
                    </button>
                  </div>
                </div>

                <div class="panel-block">
                  <p class="panel-label">Results</p>
                  <div class="search-results">
                    <button
                      v-for="video in filteredSearchResults"
                      :key="video.fileName"
                      class="search-result"
                      :class="getSearchResultClass(video.fileName)"
                      @click="handleSearchResultClick(video, $event)"
                      @mousemove="handleSearchResultHover(video.fileName, $event)"
                      @mouseleave="clearSearchResultHover"
                    >
                      <span class="search-result-title">{{
                        video.songName || video.fileName
                      }}</span>
                      <span class="search-result-meta"
                        >{{ video.artist || '—' }} · {{ video.creator || '—' }}</span
                      >
                    </button>
                    <p v-if="!filteredSearchResults.length" class="search-empty">No matches.</p>
                  </div>
                </div>

                <div class="panel-block">
                  <p class="panel-label">Playlist</p>
                  <div class="history-list history-list-scrollable">
                    <div
                      v-for="(video, index) in queuedVideosReversed"
                      :key="`search-queued-${video.fileName}-${index}`"
                      :class="[
                        'history-item',
                        'history-item-upcoming',
                        { 'history-item-remove': hoveredQueueIndex === index },
                      ]"
                      @mouseenter="handleQueuedHover(index)"
                      @mouseleave="clearQueuedHover"
                      @click="handleQueuedClick(video, index)"
                    >
                      <span class="search-result-title">{{ formatVideoTitle(video) }}</span>
                      <span class="search-result-meta">
                        {{
                          hoveredQueueIndex === index
                            ? 'Click to remove from queue'
                            : formatVideoMeta(video)
                        }}
                      </span>
                    </div>
                    <div class="history-item history-item-current">
                      <span class="search-result-title">{{ shuffleNowTitle }}</span>
                      <span class="search-result-meta">{{ shuffleNowMeta }}</span>
                    </div>
                    <div
                      v-for="(video, index) in shuffleHistory"
                      :key="`search-prev-${video.fileName}-${index}`"
                      class="history-item history-item-previous"
                      @click="handleShuffleHistoryClick(video)"
                    >
                      <span class="search-result-title">{{ formatVideoTitle(video) }}</span>
                      <span class="search-result-meta">{{ formatVideoMeta(video) }}</span>
                    </div>
                    <p
                      v-if="!queuedVideosReversed.length && !shuffleHistory.length"
                      class="search-empty"
                    >
                      No songs yet.
                    </p>
                  </div>
                </div>
              </template>
            </template>
          </div>
        </aside>

        <div class="now-playing">
          <div class="panel-block">
            <p class="panel-label">Song</p>
            <p class="panel-value">{{ nowPlayingSong || '—' }}</p>
          </div>
          <div class="panel-block">
            <p class="panel-label">Artist</p>
            <p class="panel-value">{{ nowPlayingArtist || '—' }}</p>
          </div>
          <div class="panel-block">
            <p class="panel-label">Creator</p>
            <p class="panel-value">{{ nowPlayingCreator || '—' }}</p>
          </div>
        </div>

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
              <button
                class="control-btn"
                :disabled="!shuffleHistory.length"
                @click="handleBackClick"
              >
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
      </div>
    </main>

    <aside class="right-sidebar">
      <div class="sidebar-content">
        <div class="panel-block">
          <p class="panel-label">Pick Probability</p>
          <p class="panel-value">{{ pickProbabilityLabel }}</p>
        </div>
        <div class="panel-block">
          <p class="panel-label">Resolution</p>
          <p class="panel-value">{{ resolutionLabel }}</p>
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
                  active: isOptionSelected(pendingUpdateFormOptions, updateFormOptions[0]),
                }"
                @click="toggleOption('updateForm', updateFormOptions[0])"
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
                  active: isOptionSelected(pendingUpdateFormOptions, updateFormOptions[1]),
                }"
                @click="toggleOption('updateForm', updateFormOptions[1])"
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
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, computed, nextTick } from 'vue'
  import { useVideoFileBrowser } from '../../shared/composables/useFileBrowser'
  import { videoDataService } from '../../shared/services/videoDataService'
  import type { VideoMetadata } from '../../shared/types/media'
  import { selectedVideoName } from '../../shared/state/videoSelection'

  const { currentPath, files, selectDirectory, directoryHandle } = useVideoFileBrowser()

  const playMode = ref<'shuffle' | 'shuffle-tags' | 'search'>('shuffle')
  const videosInDatabase = ref<VideoMetadata[]>([])
  const selectedVideo = ref<VideoMetadata | null>(null)
  const videoSrc = ref<string>('')
  const videoEl = ref<HTMLVideoElement | null>(null)
  let currentObjectUrl: string | null = null
  const isPlaying = ref(false)
  const volume = ref(1)
  const isMuted = ref(false)
  const volumeBeforeMute = ref(1)
  const lastPickProbability = ref<number | null>(null)
  const isScrubbing = ref(false)
  const progressBarEl = ref<HTMLElement | null>(null)
  const audioContext = ref<AudioContext | null>(null)
  const audioSource = ref<MediaElementAudioSourceNode | null>(null)
  const gainNode = ref<GainNode | null>(null)
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

  const nowPlayingSong = computed(() => selectedVideo.value?.songName ?? '')
  const nowPlayingArtist = computed(() => selectedVideo.value?.artist ?? '')
  const nowPlayingCreator = computed(() => selectedVideo.value?.creator ?? '')
  const editOptions = ['Too high resolution', 'Fluff beginning', 'Fluff end', 'Multiple songs']
  const updateFormOptions = ['Check girls', 'Check themes']

  const pendingDelete = ref('no')
  const pendingEditOptions = ref<string[]>([])
  const pendingUpdateFormOptions = ref<string[]>([])
  const pendingUpdateGirls = ref('')
  const pendingUpdateThemes = ref('')

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

  const currentThemes = computed(() => parseTagList(selectedVideo.value?.theme))
  const currentGirls = computed(() => parseTagList(selectedVideo.value?.mainGirl))

  function parseMultiOption(value?: string) {
    if (!value) return []
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item)
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

  const selectedTags = ref<string[]>([])
  const tagMatchMode = ref<'any' | 'all'>('any')
  const tagSearch = ref('')
  const isTagSearchFocused = ref(false)

  const selectedGirls = ref<string[]>([])
  const girlMatchMode = ref<'any' | 'all'>('any')
  const girlSearch = ref('')
  const isGirlSearchFocused = ref(false)
  const onlyNoThemes = ref(false)
  const onlyNoGirls = ref(false)
  const queuedVideos = ref<VideoMetadata[]>([])

  const shuffleHistory = ref<VideoMetadata[]>([])
  const nextShuffleVideo = ref<VideoMetadata | null>(null)
  const historyListEl = ref<HTMLElement | null>(null)
  const lastWeightedPick = ref<VideoMetadata | null>(null)
  const lastWeightedCandidates = ref<VideoMetadata[]>([])
  const suppressHistoryOnce = ref(false)

  const songSearch = ref('')
  const artistSearch = ref('')
  const creatorSearch = ref('')
  const isSongSearchFocused = ref(false)
  const isArtistSearchFocused = ref(false)
  const isCreatorSearchFocused = ref(false)
  const selectedSong = ref<string | null>(null)
  const selectedArtist = ref<string | null>(null)
  const selectedCreator = ref<string | null>(null)
  const hoveredSearchId = ref<string | null>(null)
  const hoveredSearchSide = ref<'left' | 'right' | null>(null)
  const hoveredQueueIndex = ref<number | null>(null)

  function normalizeList(value?: string[] | string) {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }

  function normalizeText(value?: string | null) {
    return (value ?? '').trim().toLowerCase()
  }

  function formatVideoLabel(video: VideoMetadata) {
    const song = (video.songName || '').trim()
    const artist = (video.artist || '').trim()
    if (song && artist) return `${song} — ${artist}`
    if (song) return song
    return video.fileName
  }

  function formatVideoTitle(video: VideoMetadata) {
    const song = (video.songName || '').trim()
    return song || video.fileName
  }

  function formatVideoMeta(video: VideoMetadata) {
    const artist = (video.artist || '').trim() || '—'
    const creator = (video.creator || '').trim() || '—'
    return `${artist} · ${creator}`
  }

  function pickRandomFromList(list: VideoMetadata[], excludeFile?: string) {
    const candidates = excludeFile ? list.filter((v) => v.fileName !== excludeFile) : list
    if (!candidates.length) return null
    const idx = Math.floor(Math.random() * candidates.length)
    return candidates[idx]
  }

  function getShuffleCandidates(mode: 'shuffle' | 'shuffle-tags', currentFileName?: string) {
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

  function weightedPick(candidates: VideoMetadata[]) {
    if (!candidates.length) return null
    const weights = candidates.map((v) => Math.max(1, v.weightScore || 1))
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    let roll = Math.random() * totalWeight
    let pickedIndex = 0
    for (let i = 0; i < candidates.length; i += 1) {
      roll -= weights[i]
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

  function updateShuffleHistoryLimit() {
    const el = historyListEl.value
    if (!el) return

    const rect = el.getBoundingClientRect()
    const available = window.innerHeight - rect.top - 20
    if (!Number.isFinite(available) || available <= 0) return

    const gap = parseFloat(getComputedStyle(el).rowGap || '0')
    const nextEl = el.querySelector('.history-item-next') as HTMLElement | null
    const currentEl = el.querySelector('.history-item-current') as HTMLElement | null
    const sample = el.querySelector('.history-item-previous') as HTMLElement | null
    if (!sample) return

    let used = 0
    if (nextEl) used += nextEl.offsetHeight
    if (currentEl) used += currentEl.offsetHeight
    const fixedGaps = nextEl && currentEl ? gap * 2 : gap
    used += fixedGaps

    const itemHeight = sample.offsetHeight
    const maxItems = Math.max(0, Math.floor((available - used + gap) / (itemHeight + gap)))

    if (shuffleHistory.value.length > maxItems) {
      shuffleHistory.value = shuffleHistory.value.slice(0, maxItems)
    }
  }

  function matchesQuery(value: string, query: string) {
    if (!query) return true
    return value.toLowerCase().includes(query)
  }

  function matchesSelected(value: string, selected: string | null) {
    if (!selected) return true
    return value.toLowerCase() === selected.toLowerCase()
  }

  const uniqueTags = computed(() => {
    const tagsByLower = new Map<string, string>()
    videosInDatabase.value.forEach((video) => {
      const themes = normalizeList(video.theme)
      themes.forEach((t) => {
        if (!t) return
        const lower = t.toLowerCase()
        if (!tagsByLower.has(lower)) {
          tagsByLower.set(lower, t)
        }
      })
    })
    return Array.from(tagsByLower.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    )
  })

  const uniqueGirls = computed(() => {
    const girlsByLower = new Map<string, string>()
    videosInDatabase.value.forEach((video) => {
      const girls = normalizeList(video.mainGirl)
      girls.forEach((g) => {
        if (!g) return
        const lower = g.toLowerCase()
        if (!girlsByLower.has(lower)) {
          girlsByLower.set(lower, g)
        }
      })
    })
    return Array.from(girlsByLower.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    )
  })

  function matchesSelection(itemsLower: string[], selectedLower: string[], mode: 'any' | 'all') {
    if (selectedLower.length === 0) return true
    if (mode === 'all') {
      return selectedLower.every((tag) => itemsLower.includes(tag))
    }
    return selectedLower.some((tag) => itemsLower.includes(tag))
  }

  function matchesThemeFilter(themesLower: string[], selectedLower: string[]) {
    if (onlyNoThemes.value) return themesLower.length === 0
    return matchesSelection(themesLower, selectedLower, tagMatchMode.value)
  }

  function matchesGirlFilter(girlsLower: string[], selectedLower: string[]) {
    if (onlyNoGirls.value) return girlsLower.length === 0
    return matchesSelection(girlsLower, selectedLower, girlMatchMode.value)
  }

  function countVideosForTag(tag: string) {
    const tagLower = tag.toLowerCase()
    const selectedThemesLower = selectedTags.value.map((t) => t.toLowerCase())
    const selectedGirlsLower = selectedGirls.value.map((g) => g.toLowerCase())
    if (onlyNoThemes.value) return 0
    const requiredThemes =
      tagMatchMode.value === 'all'
        ? Array.from(new Set([...selectedThemesLower, tagLower]))
        : [tagLower]

    return videosInDatabase.value.filter((video) => {
      const themesLower = normalizeList(video.theme).map((t) => t.toLowerCase())
      const girlsLower = normalizeList(video.mainGirl).map((g) => g.toLowerCase())
      if (themesLower.length === 0) return false
      const matchesThemes =
        tagMatchMode.value === 'all'
          ? requiredThemes.every((t) => themesLower.includes(t))
          : themesLower.includes(tagLower)
      const matchesGirls = matchesGirlFilter(girlsLower, selectedGirlsLower)
      return matchesThemes && matchesGirls
    }).length
  }

  function countVideosForGirl(girl: string) {
    const girlLower = girl.toLowerCase()
    const selectedThemesLower = selectedTags.value.map((t) => t.toLowerCase())
    const selectedGirlsLower = selectedGirls.value.map((g) => g.toLowerCase())
    if (onlyNoGirls.value) return 0
    const requiredGirls =
      girlMatchMode.value === 'all'
        ? Array.from(new Set([...selectedGirlsLower, girlLower]))
        : [girlLower]

    return videosInDatabase.value.filter((video) => {
      const themesLower = normalizeList(video.theme).map((t) => t.toLowerCase())
      const girlsLower = normalizeList(video.mainGirl).map((g) => g.toLowerCase())
      if (girlsLower.length === 0) return false
      const matchesThemes = matchesThemeFilter(themesLower, selectedThemesLower)
      const matchesGirls =
        girlMatchMode.value === 'all'
          ? requiredGirls.every((g) => girlsLower.includes(g))
          : girlsLower.includes(girlLower)
      return matchesThemes && matchesGirls
    }).length
  }

  const noThemesCount = computed(() => {
    const selectedGirlsLower = selectedGirls.value.map((g) => g.toLowerCase())
    return videosInDatabase.value.filter((video) => {
      const themesLower = normalizeList(video.theme).map((t) => t.toLowerCase())
      const girlsLower = normalizeList(video.mainGirl).map((g) => g.toLowerCase())
      if (themesLower.length > 0) return false
      return matchesGirlFilter(girlsLower, selectedGirlsLower)
    }).length
  })

  const noGirlsCount = computed(() => {
    const selectedThemesLower = selectedTags.value.map((t) => t.toLowerCase())
    return videosInDatabase.value.filter((video) => {
      const themesLower = normalizeList(video.theme).map((t) => t.toLowerCase())
      const girlsLower = normalizeList(video.mainGirl).map((g) => g.toLowerCase())
      if (girlsLower.length > 0) return false
      return matchesThemeFilter(themesLower, selectedThemesLower)
    }).length
  })

  const filteredTags = computed(() => {
    const search = tagSearch.value.trim().toLowerCase()
    const selectedLower = new Set(selectedTags.value.map((t) => t.toLowerCase()))
    const items = uniqueTags.value
      .filter((tag) => !selectedLower.has(tag.toLowerCase()))
      .filter((tag) => (search ? tag.toLowerCase().includes(search) : true))
      .map((tag) => {
        const count = countVideosForTag(tag)
        return {
          key: `theme:${tag.toLowerCase()}`,
          type: 'theme' as const,
          tag,
          count,
          label: `${tag} (${count})`,
        }
      })
      .filter((item) => item.count > 0)

    if (!onlyNoThemes.value && noThemesCount.value > 0 && !search) {
      items.unshift({
        key: 'theme:none',
        type: 'no-theme' as const,
        tag: '',
        count: noThemesCount.value,
        label: `No themes (${noThemesCount.value})`,
      })
    }

    return items
  })

  const filteredGirls = computed(() => {
    const search = girlSearch.value.trim().toLowerCase()
    const selectedLower = new Set(selectedGirls.value.map((g) => g.toLowerCase()))
    const items = uniqueGirls.value
      .filter((girl) => !selectedLower.has(girl.toLowerCase()))
      .filter((girl) => (search ? girl.toLowerCase().includes(search) : true))
      .map((girl) => {
        const count = countVideosForGirl(girl)
        return {
          key: `girl:${girl.toLowerCase()}`,
          type: 'girl' as const,
          tag: girl,
          count,
          label: `${girl} (${count})`,
        }
      })
      .filter((item) => item.count > 0)

    if (!onlyNoGirls.value && noGirlsCount.value > 0 && !search) {
      items.unshift({
        key: 'girl:none',
        type: 'no-girl' as const,
        tag: '',
        count: noGirlsCount.value,
        label: `No girls (${noGirlsCount.value})`,
      })
    }

    return items
  })

  const filteredSongs = computed(() => {
    const query = normalizeText(songSearch.value)
    const items = new Map<string, { key: string; value: string; count: number; label: string }>()

    videosInDatabase.value.forEach((video) => {
      const song = (video.songName || '').trim()
      if (!song) return
      const artist = (video.artist || '').trim()
      const creator = (video.creator || '').trim()
      if (!matchesSelected(artist, selectedArtist.value)) return
      if (!matchesSelected(creator, selectedCreator.value)) return

      const key = song.toLowerCase()
      const existing = items.get(key)
      const count = (existing?.count ?? 0) + 1
      items.set(key, { key: `song:${key}`, value: song, count, label: `${song} (${count})` })
    })

    return Array.from(items.values())
      .filter((item) => matchesQuery(item.value, query))
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }))
  })

  const filteredArtists = computed(() => {
    const query = normalizeText(artistSearch.value)
    const items = new Map<string, { key: string; value: string; count: number; label: string }>()

    videosInDatabase.value.forEach((video) => {
      const artist = (video.artist || '').trim()
      if (!artist) return
      const song = (video.songName || '').trim()
      const creator = (video.creator || '').trim()
      if (!matchesSelected(song, selectedSong.value)) return
      if (!matchesSelected(creator, selectedCreator.value)) return

      const key = artist.toLowerCase()
      const existing = items.get(key)
      const count = (existing?.count ?? 0) + 1
      items.set(key, { key: `artist:${key}`, value: artist, count, label: `${artist} (${count})` })
    })

    return Array.from(items.values())
      .filter((item) => matchesQuery(item.value, query))
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }))
  })

  const filteredCreators = computed(() => {
    const query = normalizeText(creatorSearch.value)
    const items = new Map<string, { key: string; value: string; count: number; label: string }>()

    videosInDatabase.value.forEach((video) => {
      const creator = (video.creator || '').trim()
      if (!creator) return
      const song = (video.songName || '').trim()
      const artist = (video.artist || '').trim()
      if (!matchesSelected(song, selectedSong.value)) return
      if (!matchesSelected(artist, selectedArtist.value)) return

      const key = creator.toLowerCase()
      const existing = items.get(key)
      const count = (existing?.count ?? 0) + 1
      items.set(key, {
        key: `creator:${key}`,
        value: creator,
        count,
        label: `${creator} (${count})`,
      })
    })

    return Array.from(items.values())
      .filter((item) => matchesQuery(item.value, query))
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }))
  })

  const filteredSearchResults = computed(() => {
    const songQuery = normalizeText(songSearch.value)
    const artistQuery = normalizeText(artistSearch.value)
    const creatorQuery = normalizeText(creatorSearch.value)

    return videosInDatabase.value.filter((video) => {
      const song = (video.songName || '').trim()
      const artist = (video.artist || '').trim()
      const creator = (video.creator || '').trim()

      if (!matchesSelected(song, selectedSong.value)) return false
      if (!matchesSelected(artist, selectedArtist.value)) return false
      if (!matchesSelected(creator, selectedCreator.value)) return false

      if (songQuery && !matchesQuery(song, songQuery)) return false
      if (artistQuery && !matchesQuery(artist, artistQuery)) return false
      if (creatorQuery && !matchesQuery(creator, creatorQuery)) return false

      return true
    })
  })

  const shuffleNowLabel = computed(() => {
    return selectedVideo.value ? formatVideoLabel(selectedVideo.value) : '—'
  })

  const shuffleNextLabel = computed(() => {
    return nextShuffleVideo.value ? formatVideoLabel(nextShuffleVideo.value) : '—'
  })

  const shuffleNowTitle = computed(() => {
    return selectedVideo.value ? formatVideoTitle(selectedVideo.value) : '—'
  })

  const shuffleNowMeta = computed(() => {
    return selectedVideo.value ? formatVideoMeta(selectedVideo.value) : '—'
  })

  const shuffleNextTitle = computed(() => {
    return nextShuffleVideo.value ? formatVideoTitle(nextShuffleVideo.value) : '—'
  })

  const shuffleNextMeta = computed(() => {
    return nextShuffleVideo.value ? formatVideoMeta(nextShuffleVideo.value) : '—'
  })

  const searchNextTitle = computed(() => {
    return queuedVideos.value.length ? formatVideoTitle(queuedVideos.value[0]) : '—'
  })

  const searchNextMeta = computed(() => {
    return queuedVideos.value.length ? formatVideoMeta(queuedVideos.value[0]) : '—'
  })

  const queuedVideosReversed = computed(() => {
    return [...queuedVideos.value].reverse()
  })

  function addTag(tag: string) {
    const lower = tag.toLowerCase()
    const exists = selectedTags.value.some((t) => t.toLowerCase() === lower)
    if (!exists) {
      selectedTags.value = [...selectedTags.value, tag]
    }
    tagSearch.value = ''
  }

  function handleTagOption(item: { type: 'theme' | 'no-theme'; tag: string }) {
    if (item.type === 'no-theme') {
      onlyNoThemes.value = true
      tagSearch.value = ''
      return
    }
    addTag(item.tag)
  }

  function removeTag(tag: string) {
    const lower = tag.toLowerCase()
    selectedTags.value = selectedTags.value.filter((t) => t.toLowerCase() !== lower)
  }

  function addGirl(girl: string) {
    const lower = girl.toLowerCase()
    const exists = selectedGirls.value.some((g) => g.toLowerCase() === lower)
    if (!exists) {
      selectedGirls.value = [...selectedGirls.value, girl]
    }
    girlSearch.value = ''
  }

  function handleGirlOption(item: { type: 'girl' | 'no-girl'; tag: string }) {
    if (item.type === 'no-girl') {
      onlyNoGirls.value = true
      girlSearch.value = ''
      return
    }
    addGirl(item.tag)
  }

  function selectSong(value: string) {
    selectedSong.value = value
    songSearch.value = ''
  }

  function selectArtist(value: string) {
    selectedArtist.value = value
    artistSearch.value = ''
  }

  function selectCreator(value: string) {
    selectedCreator.value = value
    creatorSearch.value = ''
  }

  function queueVideo(video: VideoMetadata) {
    queuedVideos.value = [...queuedVideos.value, video]
  }

  async function playVideoNow(video: VideoMetadata) {
    selectedVideo.value = video
    selectedVideoName.value = video.fileName
    lastWeightedPick.value = null
    lastWeightedCandidates.value = []
    await loadSelectedVideo(true)
  }

  function handleSearchResultClick(video: VideoMetadata, event: MouseEvent) {
    const target = event.currentTarget as HTMLElement | null
    if (!target) return
    const width = target.clientWidth || target.getBoundingClientRect().width
    const clickX = Number.isFinite(event.offsetX) ? event.offsetX : 0
    if (clickX < width / 2) {
      queueVideo(video)
    } else {
      playVideoNow(video)
    }
  }

  function handleSearchResultHover(fileName: string, event: MouseEvent) {
    const target = event.currentTarget as HTMLElement | null
    if (!target) return
    const rect = target.getBoundingClientRect()
    const hoverX = event.clientX - rect.left
    hoveredSearchId.value = fileName
    hoveredSearchSide.value = hoverX < rect.width / 2 ? 'left' : 'right'
  }

  function clearSearchResultHover() {
    hoveredSearchId.value = null
    hoveredSearchSide.value = null
  }

  function getSearchResultClass(fileName: string) {
    if (hoveredSearchId.value !== fileName) return ''
    if (hoveredSearchSide.value === 'left') return 'search-result-queue'
    if (hoveredSearchSide.value === 'right') return 'search-result-play'
    return ''
  }

  async function handleShuffleNextClick() {
    if (playMode.value === 'search') {
      if (queuedVideos.value.length === 0) return
      const nextQueued = queuedVideos.value[0]
      queuedVideos.value = queuedVideos.value.slice(1)
      await playVideoNow(nextQueued)
      return
    }
    await playNext()
  }

  async function handleShuffleHistoryClick(video: VideoMetadata) {
    shuffleHistory.value = shuffleHistory.value.filter((item) => item.fileName !== video.fileName)
    await playVideoNow(video)
  }

  async function handleBackClick() {
    if (!shuffleHistory.value.length) return
    const previous = shuffleHistory.value[0]
    shuffleHistory.value = shuffleHistory.value.slice(1)
    if (selectedVideo.value) {
      queuedVideos.value = [selectedVideo.value, ...queuedVideos.value]
    }
    suppressHistoryOnce.value = true
    await playVideoNow(previous)
  }

  async function handleQueuedClick(_video: VideoMetadata, reversedIndex: number) {
    const originalIndex = queuedVideos.value.length - 1 - reversedIndex
    if (originalIndex < 0 || originalIndex >= queuedVideos.value.length) return
    queuedVideos.value = queuedVideos.value.filter((_, idx) => idx !== originalIndex)
  }

  function handleQueuedHover(reversedIndex: number) {
    hoveredQueueIndex.value = reversedIndex
  }

  function clearQueuedHover() {
    hoveredQueueIndex.value = null
  }

  function handleSongSearchBlur() {
    setTimeout(() => {
      isSongSearchFocused.value = false
    }, 120)
  }

  function handleArtistSearchBlur() {
    setTimeout(() => {
      isArtistSearchFocused.value = false
    }, 120)
  }

  function handleCreatorSearchBlur() {
    setTimeout(() => {
      isCreatorSearchFocused.value = false
    }, 120)
  }

  function removeGirl(girl: string) {
    const lower = girl.toLowerCase()
    selectedGirls.value = selectedGirls.value.filter((g) => g.toLowerCase() !== lower)
  }

  function handleTagSearchBlur() {
    setTimeout(() => {
      isTagSearchFocused.value = false
    }, 100)
  }

  function handleGirlSearchBlur() {
    setTimeout(() => {
      isGirlSearchFocused.value = false
    }, 120)
  }

  const currentTime = ref(0)
  const duration = ref(0)
  const videoWidth = ref(0)
  const videoHeight = ref(0)

  const currentTimeLabel = computed(() => formatTime(currentTime.value))
  const durationLabel = computed(() => formatTime(duration.value))
  const progressPercent = computed(() =>
    duration.value > 0 ? Math.min(100, (currentTime.value / duration.value) * 100) : 0
  )
  const pickProbabilityLabel = computed(() => {
    if (!selectedVideo.value || videosInDatabase.value.length === 0) return '—'

    let meanCandidates = videosInDatabase.value
    if (playMode.value === 'shuffle' || playMode.value === 'shuffle-tags') {
      if (lastWeightedCandidates.value.length) {
        meanCandidates = lastWeightedCandidates.value
      } else {
        meanCandidates = getShuffleCandidates(playMode.value, selectedVideo.value?.fileName)
      }
    }

    const weights = meanCandidates.map((v) => Math.max(1, v.weightScore || 1))
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    const mean = totalWeight > 0 ? 1 / totalWeight : 0
    const actual = lastPickProbability.value ?? mean

    return `Picked: ${(actual * 100).toFixed(2)}% · Mean: ${(mean * 100).toFixed(2)}%`
  })

  const resolutionLabel = computed(() => {
    if (videoWidth.value <= 0 || videoHeight.value <= 0) return '—'
    return `${videoWidth.value}x${videoHeight.value}`
  })

  async function initializeFromDirectoryHandle(handle: any) {
    await videoDataService.initialize(handle)
    videosInDatabase.value = await videoDataService.loadVideos()
  }

  function pickRandomVideo() {
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
    selectedVideo.value = selection.picked
    selectedVideoName.value = selection.picked.fileName
    lastPickProbability.value =
      selection.totalWeight > 0
        ? selection.weights[selection.pickedIndex] / selection.totalWeight
        : null
    lastWeightedPick.value = selection.picked
    lastWeightedCandidates.value = candidates
  }

  function pickNextSequential() {
    if (videosInDatabase.value.length === 0) {
      selectedVideo.value = null
      selectedVideoName.value = null
      lastPickProbability.value = null
      return
    }

    if (!selectedVideo.value) {
      selectedVideo.value = videosInDatabase.value[0]
      selectedVideoName.value = selectedVideo.value.fileName
      lastPickProbability.value = 1 / videosInDatabase.value.length
      return
    }

    const currentIndex = videosInDatabase.value.findIndex(
      (v) => v.fileName === selectedVideo.value?.fileName
    )
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % videosInDatabase.value.length : 0
    selectedVideo.value = videosInDatabase.value[nextIndex]
    selectedVideoName.value = selectedVideo.value.fileName
    lastPickProbability.value = 1 / videosInDatabase.value.length
  }

  function pickRandomByTags() {
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

    selectedVideo.value = selection.picked
    selectedVideoName.value = selection.picked.fileName
    lastPickProbability.value =
      selection.totalWeight > 0
        ? selection.weights[selection.pickedIndex] / selection.totalWeight
        : null

    lastWeightedPick.value = selection.picked
    lastWeightedCandidates.value = candidates
  }

  async function playNext() {
    if (selectedVideo.value) {
      shuffleHistory.value = [selectedVideo.value, ...shuffleHistory.value]
      suppressHistoryOnce.value = true
    }
    if (queuedVideos.value.length > 0) {
      const nextQueued = queuedVideos.value[0]
      queuedVideos.value = queuedVideos.value.slice(1)
      await playVideoNow(nextQueued)
      return
    }
    if (playMode.value === 'shuffle') {
      if (nextShuffleVideo.value) {
        const candidates = getShuffleCandidates('shuffle', selectedVideo.value?.fileName)
        const picked = nextShuffleVideo.value
        selectedVideo.value = picked
        selectedVideoName.value = picked.fileName
        const weights = candidates.map((v) => Math.max(1, v.weightScore || 1))
        const totalWeight = weights.reduce((sum, w) => sum + w, 0)
        const pickedIndex = candidates.findIndex((v) => v.fileName === picked.fileName)
        lastPickProbability.value =
          pickedIndex >= 0 && totalWeight > 0 ? weights[pickedIndex] / totalWeight : null
        lastWeightedPick.value = picked
        lastWeightedCandidates.value = candidates
      } else {
        pickRandomVideo()
      }
    } else if (playMode.value === 'shuffle-tags') {
      const currentName = selectedVideo.value?.fileName
      const candidates = getShuffleCandidates('shuffle-tags', currentName)
      if (nextShuffleVideo.value && candidates.length) {
        const picked = nextShuffleVideo.value
        const pickedIndex = candidates.findIndex((v) => v.fileName === picked.fileName)
        if (pickedIndex < 0) {
          pickRandomByTags()
          await loadSelectedVideo(true)
          return
        }
        selectedVideo.value = picked
        selectedVideoName.value = picked.fileName
        const weights = candidates.map((v) => Math.max(1, v.weightScore || 1))
        const totalWeight = weights.reduce((sum, w) => sum + w, 0)
        lastPickProbability.value =
          pickedIndex >= 0 && totalWeight > 0 ? weights[pickedIndex] / totalWeight : null
        lastWeightedPick.value = picked
        lastWeightedCandidates.value = candidates
      } else {
        pickRandomByTags()
      }
    } else {
      pickNextSequential()
    }

    await loadSelectedVideo(true)
  }

  async function loadSelectedVideo(autoPlay = true) {
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

  function formatTime(totalSeconds: number) {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '00:00'
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
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

  function toggleMute() {
    isMuted.value = !isMuted.value
    if (isMuted.value) {
      volumeBeforeMute.value = volume.value
    } else {
      volume.value = volumeBeforeMute.value || 1
    }
    applyGain()
  }

  const volumePercent = computed(() => `${Math.round(volume.value * 100)}%`)

  function handlePlay() {
    isPlaying.value = true
  }

  function handlePause() {
    isPlaying.value = false
  }

  watch(
    directoryHandle,
    async (newHandle) => {
      if (newHandle) {
        await initializeFromDirectoryHandle(newHandle)
        if (playMode.value === 'shuffle' && !selectedVideo.value) {
          pickRandomVideo()
        }
      }
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

  watch([selectedVideo, directoryHandle], () => {
    loadSelectedVideo()
  })

  watch(
    [selectedVideo, playMode, selectedTags, selectedGirls, onlyNoThemes, onlyNoGirls],
    (values, prevValues) => {
      const [video, mode] = values as [VideoMetadata | null, string]
      const prevVideo = prevValues ? (prevValues[0] as VideoMetadata | null) : null
      if (prevVideo && prevVideo.fileName !== video?.fileName) {
        if (suppressHistoryOnce.value) {
          suppressHistoryOnce.value = false
        } else {
          shuffleHistory.value = [prevVideo, ...shuffleHistory.value]
        }
      }
      if (mode === 'shuffle' || mode === 'shuffle-tags') {
        if (queuedVideos.value.length > 0) {
          nextShuffleVideo.value = null
          nextTick().then(updateShuffleHistoryLimit)
          return
        }
        if (video) {
          const candidates = getShuffleCandidates(
            mode as 'shuffle' | 'shuffle-tags',
            video.fileName
          )
          if (mode === 'shuffle-tags') {
            const selection = weightedPick(candidates)
            nextShuffleVideo.value = selection ? selection.picked : null
          } else {
            const selection = weightedPick(candidates)
            nextShuffleVideo.value = selection ? selection.picked : null
          }
        }
      } else {
        nextShuffleVideo.value = null
      }
      nextTick().then(updateShuffleHistoryLimit)
    }
  )

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

  function ensureAudioPipeline(el: HTMLVideoElement) {
    if (audioContext.value && audioSource.value && gainNode.value) return
    const context = new AudioContext()
    const source = context.createMediaElementSource(el)
    const gain = context.createGain()
    source.connect(gain).connect(context.destination)
    audioContext.value = context
    audioSource.value = source
    gainNode.value = gain
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

  function applyGain() {
    if (!videoEl.value) return
    ensureAudioPipeline(videoEl.value)
    if (gainNode.value) {
      gainNode.value.gain.value = isMuted.value ? 0 : volume.value
    }
  }

  watch(playMode, (mode) => {
    if (mode === 'shuffle' || mode === 'shuffle-tags') {
      nextShuffleVideo.value = null
      if (queuedVideos.value.length > 0) {
        nextTick().then(updateShuffleHistoryLimit)
        return
      }
      if (!selectedVideo.value) {
        if (mode === 'shuffle') {
          pickRandomVideo()
        } else {
          pickRandomByTags()
        }
      } else {
        const candidates = getShuffleCandidates(mode, selectedVideo.value.fileName)
        if (mode === 'shuffle-tags') {
          const selection = weightedPick(candidates)
          nextShuffleVideo.value = selection ? selection.picked : null
        } else {
          const selection = weightedPick(candidates)
          nextShuffleVideo.value = selection ? selection.picked : null
        }
      }
      nextTick().then(updateShuffleHistoryLimit)
      return
    }

    nextShuffleVideo.value = null
  })

  watch(shuffleHistory, () => {
    nextTick().then(updateShuffleHistoryLimit)
  })

  watch(historyListEl, (el, _, onCleanup) => {
    if (!el) return
    const handleResize = () => updateShuffleHistoryLimit()
    window.addEventListener('resize', handleResize)
    const observer = new ResizeObserver(handleResize)
    observer.observe(el)
    onCleanup(() => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    })
  })
</script>

<style scoped>
  .video-player-app {
    width: 100%;
    height: 100vh;
    display: grid;
    grid-template-columns: 1fr;
    background: #f3f4f6;
    color: #333;
  }

  .left-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 320px;
    height: 100vh;
    background: rgba(31, 41, 55, 0.9);
    color: #fff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 0 12px 12px 0;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 5;
  }

  .right-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 320px;
    height: 100vh;
    background: rgba(31, 41, 55, 0.9);
    color: #fff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 12px 0 0 12px;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 5;
  }

  .right-sidebar:hover {
    opacity: 1;
  }

  .left-sidebar:hover {
    opacity: 1;
  }
  .now-playing {
    position: absolute;
    top: 0.25rem;
    left: 0.25rem;
    right: 0.25rem;
    display: flex;
    flex-direction: row;
    gap: 0.75rem;
    justify-content: center;
    align-items: center;
    background: rgba(31, 41, 55, 0.88);
    padding: 0.75rem 1rem;
    border-radius: 10px;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
    opacity: 0;
    transition: opacity 0.2s ease;
    width: auto;
    z-index: 4;
    pointer-events: auto;
  }

  .now-playing:hover {
    opacity: 1;
  }

  .sidebar-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;
    height: 100%;
    max-height: 100vh;
    box-sizing: border-box;
  }

  .btn-select {
    padding: 0.75rem 1.5rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 600;
    transition: background 0.2s ease;
  }

  .btn-select:hover {
    background: #5568d3;
  }

  .btn-secondary {
    padding: 0.65rem 1.25rem;
    background: rgba(255, 255, 255, 0.12);
    color: #f9fafb;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: background 0.2s ease;
  }

  .btn-secondary.active {
    background: rgba(102, 126, 234, 0.45);
    border-color: rgba(102, 126, 234, 0.8);
  }

  .path-display {
    padding: 0.6rem 0.75rem;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    font-size: 0.85rem;
    color: #e0e0e0;
    word-break: break-all;
  }

  .file-list {
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    max-height: 65vh;
    overflow-y: auto;
  }

  .file-item {
    padding: 0.65rem 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: background 0.2s ease;
    color: #f5f5f5;
  }

  .file-item:last-child {
    border-bottom: none;
  }

  .file-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .file-icon {
    font-size: 1rem;
    min-width: 20px;
  }

  .file-name {
    font-size: 0.9rem;
    word-break: break-word;
  }

  .empty-state {
    padding: 1.5rem 0.5rem;
    text-align: center;
    color: #cfcfcf;
    font-size: 0.9rem;
  }

  .player-main {
    display: flex;
    flex-direction: column;
    padding: 0%;
    height: 100vh;
    max-height: 100vh;
    background: #111827;
  }

  .player-stage {
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
    max-height: 100vh;
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

  .player-icon {
    font-size: 3rem;
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

  .player-controls:hover {
    opacity: 1;
  }

  .progress-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }

  .control-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.75rem;
  }

  .transport-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }

  .control-spacer {
    height: 1px;
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
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: #667eea;
    width: 0%;
    transition: width 0.1s linear;
  }

  .time-label {
    font-size: 0.85rem;
    color: #e5e7eb;
    min-width: 48px;
    text-align: center;
  }

  .panel-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: #111827;
  }

  .panel-block {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 160px;
    align-items: center;
  }

  .panel-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #cbd5f5;
    margin: 0;
    text-align: center;
  }

  .panel-value {
    margin: 0;
    font-size: 0.95rem;
    color: #f9fafb;
    text-align: center;
  }

  .btn-secondary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .sidebar-select {
    width: 100%;
    padding: 0.45rem 0.6rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: #f9fafb;
    font-size: 0.85rem;
    text-align: center;
    min-height: 2.1rem;
  }

  .sidebar-select option {
    color: #111827;
  }

  .option-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: center;
  }

  .option-chip {
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: #f9fafb;
    border-radius: 999px;
    padding: 0.35rem 0.7rem;
    font-size: 0.78rem;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease;
  }

  .option-chip:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .option-chip.active {
    background: rgba(102, 126, 234, 0.35);
    border-color: rgba(102, 126, 234, 0.8);
    color: #fff;
  }

  .sidebar-input {
    width: 100%;
    padding: 0.5rem 0.65rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: #f9fafb;
    font-size: 0.82rem;
  }

  .sidebar-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .tag-update-rows {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    width: 100%;
  }

  .tag-update-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.6rem;
    align-items: center;
  }

  .radio-group {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
  }

  .radio-option {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    color: #f9fafb;
    cursor: pointer;
  }

  .radio-option input[type='radio'] {
    cursor: pointer;
  }

  .tag-mode {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .tag-search {
    position: relative;
  }

  .tag-search-input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: #f9fafb;
    font-size: 0.9rem;
  }

  .tag-search-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .tag-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: rgba(17, 24, 39, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    margin-top: 0.35rem;
    max-height: 320px;
    overflow-y: auto;
    z-index: 6;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
    padding: 0.25rem;
  }

  .tag-option {
    width: 100%;
    text-align: left;
    padding: 0.6rem 0.8rem;
    background: rgba(255, 255, 255, 0.04);
    border: none;
    color: #f9fafb;
    cursor: pointer;
    border-radius: 8px;
    font-size: 0.9rem;
  }

  .tag-option:hover {
    background: rgba(102, 126, 234, 0.25);
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.5rem;
  }

  .tag-list-sidebar {
    justify-content: center;
  }

  .tag-selected {
    padding: 0.35rem 0.6rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: #e5e7eb;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .tag-selected:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .tag-selected-static {
    cursor: default;
  }

  .tag-selected-static:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .search-results {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 320px;
    overflow: auto;
  }

  .search-result {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(17, 24, 39, 0.8);
    color: #f9fafb;
    text-align: left;
    cursor: pointer;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease,
      border-color 0.15s ease;
    width: 100%;
  }

  .search-result:hover {
    border-color: rgba(255, 255, 255, 0.45);
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.25);
    transform: translateY(-1px);
  }

  .search-result-queue {
    background: linear-gradient(90deg, rgba(96, 165, 250, 0.25) 0%, rgba(17, 24, 39, 0.8) 60%);
    border-color: rgba(96, 165, 250, 0.5);
  }

  .search-result-play {
    background: linear-gradient(90deg, rgba(17, 24, 39, 0.8) 0%, rgba(34, 197, 94, 0.25) 60%);
    border-color: rgba(34, 197, 94, 0.5);
  }

  .search-result-title {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .search-result-meta {
    font-size: 0.8rem;
    opacity: 0.75;
  }

  .search-empty {
    font-size: 0.85rem;
    opacity: 0.7;
    margin: 4px 0 0;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: hidden;
  }

  .history-list-scrollable {
    max-height: 30vh;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 4px;
  }

  .history-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(17, 24, 39, 0.8);
    color: #f9fafb;
    text-align: left;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease,
      border-color 0.15s ease;
    font-size: 0.85rem;
  }

  .history-item:hover {
    border-color: rgba(255, 255, 255, 0.45);
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.25);
    transform: translateY(-1px);
  }

  .history-item-next,
  .history-item-previous {
    cursor: pointer;
  }

  .history-item-next {
    border: 2px dotted rgba(255, 255, 255, 0.45);
  }

  .history-item-upcoming {
    border: 2px dotted rgba(255, 255, 255, 0.45);
  }

  .history-item-remove {
    border-color: rgba(248, 113, 113, 0.9);
    background: rgba(127, 29, 29, 0.45);
  }

  .history-item-remove .search-result-meta {
    color: #fecaca;
    opacity: 1;
  }

  .history-item-current {
    border: 2px solid rgba(255, 255, 255, 0.65);
    font-weight: 600;
  }

  @media (max-width: 900px) {
    .video-player-app {
      grid-template-columns: 1fr;
    }
  }
</style>
