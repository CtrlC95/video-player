<template>
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
              <div v-if="isArtistSearchFocused && filteredArtists.length" class="tag-dropdown">
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
              <button v-if="selectedArtist" class="tag-selected" @click="selectedArtist = null">
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
              <div v-if="isCreatorSearchFocused && filteredCreators.length" class="tag-dropdown">
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
              <button v-if="selectedCreator" class="tag-selected" @click="selectedCreator = null">
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
                <span class="search-result-title">{{ video.songName || video.fileName }}</span>
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
              <p v-if="!queuedVideosReversed.length && !shuffleHistory.length" class="search-empty">
                No songs yet.
              </p>
            </div>
          </div>
        </template>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { computed, nextTick, ref, watch } from 'vue'
  import type { VideoMetadata } from '../../../shared/types/media'
  import { useVideoFileBrowser } from '../../../shared/composables/useFileBrowser'
  import {
    selectedTags,
    playMode,
    queuedVideos,
    selectedVideo,
    nextShuffleVideo,
    shuffleHistory,
    selectedGirls,
    onlyNoThemes,
    onlyNoGirls,
    tagMatchMode,
    girlMatchMode,
    videosInDatabase,
    suppressHistoryOnce,
  } from '../../../shared/composables/useVideoplayerState'
  import { videoDataService } from '../../../shared/services/videoDataService'
  import {
    normalizeList,
    matchesGirlFilter,
    matchesThemeFilter,
    playVideoNow,
    playNext,
    pickRandomVideo,
    getShuffleCandidates,
    weightedPick,
    pickRandomByTags,
  } from '../../../shared/utils/videoPlayerUtils'

  const { currentPath, selectDirectory } = useVideoFileBrowser()
  const { directoryHandle } = useVideoFileBrowser()

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
  const girlSearch = ref('')
  const isGirlSearchFocused = ref(false)
  const tagSearch = ref('')
  const isTagSearchFocused = ref(false)
  const historyListEl = ref<HTMLElement | null>(null)

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
        type: 'theme' as const,
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
        type: 'girl' as const,
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

  const queuedVideosReversed = computed(() => {
    return [...queuedVideos.value].reverse()
  })

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
      if (girlsLower && girlsLower.length > 0) return false
      return matchesThemeFilter(themesLower, selectedThemesLower)
    }).length
  })

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

  function formatVideoTitle(video: VideoMetadata) {
    return (video.songName || '').trim() || video.fileName
  }

  function formatVideoMeta(video: VideoMetadata) {
    return `${(video.artist || '').trim() || '—'} · ${(video.creator || '').trim() || '—'}`
  }

  function normalizeText(value?: string | null) {
    return (value ?? '').trim().toLowerCase()
  }

  function handleTagOption(item: { type: 'theme' | 'no-theme'; tag: string }) {
    if (item.type === 'no-theme') {
      onlyNoThemes.value = true
      tagSearch.value = ''
      return
    }
    addTag(item.tag)
  }

  function matchesQuery(value: string, query: string) {
    if (!query) return true
    return value.toLowerCase().includes(query)
  }

  function matchesSelected(value: string, selected: string | null) {
    if (!selected) return true
    return value.toLowerCase() === selected.toLowerCase()
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

  function addTag(tag: string) {
    const lower = tag.toLowerCase()
    const exists = selectedTags.value.some((t) => t.toLowerCase() === lower)
    if (!exists) {
      selectedTags.value = [...selectedTags.value, tag]
    }
    tagSearch.value = ''
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

  async function handleShuffleNextClick() {
    if (playMode.value === 'search') {
      if (queuedVideos.value.length === 0) return
      const nextQueued = queuedVideos.value[0]
      if (nextQueued) {
        queuedVideos.value = queuedVideos.value.slice(1)
        await playVideoNow(nextQueued)
      }
      return
    }
    await playNext()
  }

  async function handleShuffleHistoryClick(video: VideoMetadata) {
    shuffleHistory.value = shuffleHistory.value.filter((item) => item.fileName !== video.fileName)
    await playVideoNow(video)
  }

  async function handleQueuedClick(_video: VideoMetadata, reversedIndex: number) {
    const originalIndex = queuedVideos.value.length - 1 - reversedIndex
    if (originalIndex < 0 || originalIndex >= queuedVideos.value.length) return
    queuedVideos.value = queuedVideos.value.filter((_, idx) => idx !== originalIndex)
  }

  async function initializeFromDirectoryHandle(handle: any) {
    await videoDataService.initialize(handle)
    videosInDatabase.value = await videoDataService.loadVideos()
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
    [selectedVideo, playMode, selectedTags, selectedGirls, onlyNoThemes, onlyNoGirls],
    (values, prevValues) => {
      const [video, mode] = values as unknown as [VideoMetadata | null, string]
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
            nextShuffleVideo.value = selection && selection.picked ? selection.picked : null
          } else {
            const selection = weightedPick(candidates)
            nextShuffleVideo.value = selection && selection.picked ? selection.picked : null
          }
        }
      } else {
        nextShuffleVideo.value = null
      }
      nextTick().then(updateShuffleHistoryLimit)
    }
  )

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
          nextShuffleVideo.value = selection && selection.picked ? selection.picked : null
        } else {
          const selection = weightedPick(candidates)
          nextShuffleVideo.value = selection && selection.picked ? selection.picked : null
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

<style src="../views/LeftSidebar.css"></style>
