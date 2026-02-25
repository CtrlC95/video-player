<template>
  <aside class="sidebar right always-visible">
    <div class="sidebar-content">
      <div class="tagging-panel" v-if="selectedFile">
        <h2 class="video-title">{{ selectedFile.name }}</h2>

        <div v-if="fileMetadata" class="file-info">
          <p :class="{ 'date-old': isDateOld, 'date-recent': isDateRecent }">
            <strong>Created:</strong> {{ fileMetadata.created }}
          </p>
        </div>

        <template v-if="filterBy === 'edit'">
          <div class="form-group">
            <label>Edit Status</label>
            <div class="edit-status-display">{{ filteredEditValue || 'not set' }}</div>
            <label>Change to:</label>
            <select
              :value="edit"
              @input="$emit('update:edit', ($event.target as HTMLSelectElement).value)"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </template>

        <template v-else-if="filterBy === 'delete'">
          <div class="form-group">
            <label>Delete Status</label>
            <div class="edit-status-display">{{ filteredDeleteValue || 'not set' }}</div>
            <div class="action-buttons">
              <button class="btn-keep" @click="keepVideo">Keep</button>
              <button class="btn-delete" @click="deleteVideo">Delete</button>
            </div>
          </div>
        </template>

        <template v-else-if="filterBy === 'update'">
          <div
            v-if="props.videosInDatabase.find((v) => v.fileName === selectedFile?.name)?.updateForm"
            class="form-group"
          >
            <label>Update</label>
            <div class="text-display">
              {{
                props.videosInDatabase.find((v) => v.fileName === selectedFile?.name)?.updateForm
              }}
            </div>
          </div>

          <div
            v-if="
              props.videosInDatabase.find((v) => v.fileName === selectedFile?.name)?.updateFormGirls
            "
            class="form-group"
          >
            <label>Update Girls</label>
            <div class="text-display">
              {{
                props.videosInDatabase.find((v) => v.fileName === selectedFile?.name)
                  ?.updateFormGirls
              }}
            </div>
          </div>

          <div
            v-if="
              props.videosInDatabase.find((v) => v.fileName === selectedFile?.name)
                ?.updateFormThemes
            "
            class="form-group"
          >
            <label>Update Theme</label>
            <div class="text-display">
              {{
                props.videosInDatabase.find((v) => v.fileName === selectedFile?.name)
                  ?.updateFormThemes
              }}
            </div>
          </div>

          <div class="form-group">
            <label>Main Girl</label>
            <div class="autocomplete-wrapper">
              <input
                :value="mainGirl"
                @input="handleMainGirlInput"
                @paste="handleMainGirlPaste"
                type="text"
                placeholder="Main girl name (comma-separated)"
              />
              <div
                v-if="showMainGirlSuggestions && filteredMainGirlSuggestions.length > 0"
                class="autocomplete-dropdown"
              >
                <div
                  v-for="suggestion in filteredMainGirlSuggestions"
                  :key="suggestion"
                  class="autocomplete-item"
                  @mousedown.prevent="selectMainGirlSuggestion(suggestion)"
                >
                  {{ suggestion }}
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Theme</label>
            <div class="autocomplete-wrapper">
              <input
                :value="theme"
                @input="handleThemeInput"
                type="text"
                placeholder="Theme (comma-separated)"
              />
              <div
                v-if="showThemeSuggestions && filteredThemeSuggestions.length > 0"
                class="autocomplete-dropdown"
              >
                <div
                  v-for="suggestion in filteredThemeSuggestions"
                  :key="suggestion"
                  class="autocomplete-item"
                  @mousedown.prevent="selectThemeSuggestion(suggestion)"
                >
                  {{ suggestion }}
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="form-group">
            <div class="label-with-button">
              <button
                class="fetch-btn"
                @click="fetchVideoTitle"
                :disabled="isLoadingTags"
                title="Fetch video title"
              >
                [+]
              </button>
              <label>Video Title</label>
            </div>
            <input
              :value="videoTitle"
              @input="$emit('update:videoTitle', ($event.target as HTMLInputElement).value)"
              type="text"
              placeholder="Video title"
            />
          </div>

          <div class="form-group">
            <div class="label-with-button">
              <button
                class="fetch-btn"
                @click="fetchCreator"
                :disabled="isLoadingTags"
                title="Fetch creator"
              >
                [+]
              </button>
              <label>Creator</label>
            </div>
            <input
              :value="creator"
              @input="$emit('update:creator', ($event.target as HTMLInputElement).value)"
              type="text"
              placeholder="Creator name"
              list="creator-list"
            />
            <datalist id="creator-list">
              <option v-for="name in uniqueCreators" :key="name" :value="name" />
            </datalist>
          </div>

          <div class="form-group">
            <div class="label-with-button">
              <button
                class="fetch-btn"
                @click="fetchSongName"
                :disabled="isLoadingTags"
                title="Fetch song name"
              >
                [+]
              </button>
              <label>Song Name</label>
            </div>
            <input
              :value="songName"
              @input="$emit('update:songName', ($event.target as HTMLInputElement).value)"
              type="text"
              placeholder="Song name"
              list="song-list"
            />
            <datalist id="song-list">
              <option v-for="name in filteredSongSuggestions" :key="name" :value="name" />
            </datalist>
          </div>

          <div class="form-group">
            <div class="label-with-button">
              <button
                class="fetch-btn"
                @click="fetchArtist"
                :disabled="isLoadingTags"
                title="Fetch artist"
              >
                [+]
              </button>
              <label>Artist</label>
            </div>
            <div class="autocomplete-wrapper">
              <input
                :value="artist"
                @input="handleArtistInput"
                type="text"
                placeholder="Artist name (comma-separated)"
              />
              <div
                v-if="showArtistSuggestions && filteredArtistSuggestions.length > 0"
                class="autocomplete-dropdown"
              >
                <div
                  v-for="suggestion in filteredArtistSuggestions"
                  :key="suggestion"
                  class="autocomplete-item"
                  @mousedown.prevent="selectArtistSuggestion(suggestion)"
                >
                  {{ suggestion }}
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Web Address</label>
            <input
              :value="webAddress"
              @input="$emit('update:webAddress', ($event.target as HTMLInputElement).value)"
              type="text"
              placeholder="https://..."
            />
          </div>

          <div class="form-group">
            <div class="label-with-button">
              <button
                class="fetch-btn"
                @click="fetchMainGirl"
                :disabled="isLoadingTags"
                title="Fetch main girl"
              >
                [+]
              </button>
              <label>Main Girl</label>
            </div>
            <div class="autocomplete-wrapper">
              <input
                :value="mainGirl"
                @input="handleMainGirlInput"
                @paste="handleMainGirlPaste"
                type="text"
                placeholder="Main girl name (comma-separated)"
              />
              <div
                v-if="showMainGirlSuggestions && filteredMainGirlSuggestions.length > 0"
                class="autocomplete-dropdown"
              >
                <div
                  v-for="suggestion in filteredMainGirlSuggestions"
                  :key="suggestion"
                  class="autocomplete-item"
                  @mousedown.prevent="selectMainGirlSuggestion(suggestion)"
                >
                  {{ suggestion }}
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <div class="label-with-button">
              <button
                class="fetch-btn"
                @click="fetchTheme"
                :disabled="isLoadingTags"
                title="Fetch theme"
              >
                [+]
              </button>
              <label>Theme</label>
            </div>
            <div class="autocomplete-wrapper">
              <input
                :value="theme"
                @input="handleThemeInput"
                type="text"
                placeholder="Theme (comma-separated)"
              />
              <div
                v-if="showThemeSuggestions && filteredThemeSuggestions.length > 0"
                class="autocomplete-dropdown"
              >
                <div
                  v-for="suggestion in filteredThemeSuggestions"
                  :key="suggestion"
                  class="autocomplete-item"
                  @mousedown.prevent="selectThemeSuggestion(suggestion)"
                >
                  {{ suggestion }}
                </div>
              </div>
            </div>
          </div>
        </template>

        <button class="btn-save" @click="$emit('save')" v-if="filterBy !== 'delete'">Save</button>
        <button
          v-if="filterBy !== 'edit' && filterBy !== 'delete'"
          class="btn-secondary"
          @click="getTags"
          :disabled="isLoadingTags"
        >
          {{ isLoadingTags ? 'Loading...' : 'Get tags' }}
        </button>

        <div v-if="saveMessage" class="save-message">{{ saveMessage }}</div>
        <div v-if="isLoadingTags" class="loading-message">Fetching tags from website...</div>
      </div>
      <div v-else class="empty-state-panel">
        <p>Select a video to tag</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { invoke } from '@tauri-apps/api/core'
  import { ref, computed, watch } from 'vue'
  import type { FileItem } from '../../../shared/composables/useFileBrowser'
  import { videoDataService } from '../../../shared/services/videoDataService'

  const isLoadingTags = ref(false)
  const isDeleting = ref(false)
  const fileMetadata = ref<{ created: string } | null>(null)
  import type { VideoMetadata } from '../../../shared/types/media'

  interface Props {
    selectedFile: FileItem | null
    directoryHandle: any
    filterBy: 'all' | 'untagged' | 'edit' | 'delete' | 'update'
    videoTitle: string
    creator: string
    songName: string
    artist: string
    webAddress: string
    mainGirl: string
    theme: string
    edit: string
    delete: string
    saveMessage: string
    videosInDatabase: VideoMetadata[]
    uniqueCreators: string[]
    uniqueMainGirls: string[]
    uniqueThemes: string[]
  }

  const props = defineProps<Props>()

  const showThemeSuggestions = ref(false)
  const showArtistSuggestions = ref(false)
  const showMainGirlSuggestions = ref(false)

  const isDateOld = computed(() => {
    if (!fileMetadata.value) return false
    const cutoffDate = new Date('2024-10-17')
    const fileDate = new Date(fileMetadata.value.created)
    return fileDate <= cutoffDate
  })

  const isDateRecent = computed(() => {
    if (!fileMetadata.value) return false
    const startDate = new Date('2024-10-17')
    const endDate = new Date('2024-11-26')
    const fileDate = new Date(fileMetadata.value.created)
    return fileDate > startDate && fileDate <= endDate
  })

  const filteredEditValue = computed(() => {
    if (!props.edit) return ''
    // Split by comma and filter out "no" and "yes"
    return props.edit
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v && v.toLowerCase() !== 'no' && v.toLowerCase() !== 'yes')
      .join(', ')
  })

  const filteredDeleteValue = computed(() => {
    if (!props.delete) return ''
    // Split by comma and filter out "no" and "yes"
    return props.delete
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v && v.toLowerCase() !== 'no' && v.toLowerCase() !== 'yes')
      .join(', ')
  })

  const allArtistNames = computed(() => {
    const artistSet = new Set<string>()
    props.videosInDatabase.forEach((video) => {
      if (video.artist) {
        video.artist.split(',').forEach((artist) => {
          const trimmed = artist.trim()
          if (trimmed) artistSet.add(trimmed)
        })
      }
    })
    return Array.from(artistSet).sort()
  })

  const filteredSongSuggestions = computed(() => {
    if (!props.artist) {
      const songSet = new Set<string>()
      props.videosInDatabase.forEach((video) => {
        if (video.songName) songSet.add(video.songName)
      })
      return Array.from(songSet).sort()
    }

    const enteredArtists = props.artist
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a)
    const songSet = new Set<string>()

    props.videosInDatabase.forEach((video) => {
      if (video.artist && video.songName) {
        const videoArtists = video.artist.split(',').map((a) => a.trim())
        const hasMatch = enteredArtists.some((entered) => videoArtists.includes(entered))
        if (hasMatch) {
          songSet.add(video.songName)
        }
      }
    })

    return Array.from(songSet).sort()
  })

  const filteredArtistSuggestions = computed(() => {
    const currentValue = props.artist
    const lastCommaIndex = currentValue.lastIndexOf(',')
    const currentPart =
      lastCommaIndex >= 0 ? currentValue.substring(lastCommaIndex + 1).trim() : currentValue.trim()

    const enteredArtists = currentValue
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a)

    let availableArtists = allArtistNames.value
    if (props.songName) {
      const artistsWithSong = new Set<string>()
      props.videosInDatabase.forEach((video) => {
        if (video.songName === props.songName && video.artist) {
          video.artist.split(',').forEach((a) => {
            const trimmed = a.trim()
            if (trimmed) artistsWithSong.add(trimmed)
          })
        }
      })
      availableArtists = Array.from(artistsWithSong)
    }

    if (!currentPart) {
      return availableArtists.filter((name) => !enteredArtists.includes(name)).slice(0, 10)
    }

    return availableArtists
      .filter(
        (name) =>
          name.toLowerCase().includes(currentPart.toLowerCase()) && !enteredArtists.includes(name)
      )
      .slice(0, 10)
  })

  const filteredMainGirlSuggestions = computed(() => {
    const currentValue = props.mainGirl
    const lastCommaIndex = currentValue.lastIndexOf(',')
    const currentPart =
      lastCommaIndex >= 0 ? currentValue.substring(lastCommaIndex + 1).trim() : currentValue.trim()

    const enteredMainGirls = currentValue
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a)

    if (!currentPart) {
      return props.uniqueMainGirls.filter((name) => !enteredMainGirls.includes(name)).slice(0, 10)
    }

    return props.uniqueMainGirls
      .filter(
        (name) =>
          name.toLowerCase().includes(currentPart.toLowerCase()) && !enteredMainGirls.includes(name)
      )
      .slice(0, 10)
  })

  const filteredThemeSuggestions = computed(() => {
    const currentValue = props.theme
    const lastCommaIndex = currentValue.lastIndexOf(',')
    const currentPart =
      lastCommaIndex >= 0 ? currentValue.substring(lastCommaIndex + 1).trim() : currentValue.trim()

    const enteredThemes = currentValue
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a)

    if (!currentPart) {
      return props.uniqueThemes.filter((name) => !enteredThemes.includes(name)).slice(0, 10)
    }

    return props.uniqueThemes
      .filter(
        (name) =>
          name.toLowerCase().includes(currentPart.toLowerCase()) && !enteredThemes.includes(name)
      )
      .slice(0, 10)
  })

  function handleArtistInput(e: Event) {
    $emit('update:artist', (e.target as HTMLInputElement).value)
    showArtistSuggestions.value = true
  }

  function selectArtistSuggestion(suggestion: string) {
    const currentValue = props.artist
    const lastCommaIndex = currentValue.lastIndexOf(',')

    let newValue: string
    if (lastCommaIndex >= 0) {
      newValue = currentValue.substring(0, lastCommaIndex + 1) + ' ' + suggestion
    } else {
      newValue = suggestion
    }

    $emit('update:artist', newValue)
    showArtistSuggestions.value = false
  }

  function handleMainGirlInput(e: Event) {
    $emit('update:mainGirl', (e.target as HTMLInputElement).value)
    showMainGirlSuggestions.value = true
  }

  // Helpers for formatting and speeding up multi-tag pastes
  function capitalizeFirst(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
  }

  function capitalizeLastToken(text: string): string {
    if (!text) return ''
    const parts = text.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ''
    const lastIdx = parts.length - 1
    parts[lastIdx] = capitalizeFirst(parts[lastIdx] ?? '')
    return parts.join(' ')
  }

  function toTokens(raw: string): string[] {
    // Split on commas, semicolons, or newlines; trim each; remove empties
    return raw
      .split(/[\n;,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  }

  // normalizeMainGirls is unused, removed to fix TS6133

  function mergeMainGirls(existing: string, incoming: string): string {
    const existingTokens = existing
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t)
    const incomingTokens = toTokens(incoming).map((t) => capitalizeLastToken(t))
    const set = new Set<string>(existingTokens)
    incomingTokens.forEach((t) => set.add(t))
    return Array.from(set).join(', ')
  }

  function handleMainGirlPaste(e: ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData?.getData('text') ?? ''
    // Merge pasted tags with any existing ones, normalizing capitalization
    const merged = mergeMainGirls(props.mainGirl || '', text)
    $emit('update:mainGirl', merged)
    showMainGirlSuggestions.value = true
  }

  function selectMainGirlSuggestion(suggestion: string) {
    const currentValue = props.mainGirl
    const lastCommaIndex = currentValue.lastIndexOf(',')

    let newValue: string
    if (lastCommaIndex >= 0) {
      newValue = currentValue.substring(0, lastCommaIndex + 1) + ' ' + suggestion
    } else {
      newValue = suggestion
    }

    $emit('update:mainGirl', newValue)
    showMainGirlSuggestions.value = false
  }

  function handleThemeInput(e: Event) {
    $emit('update:theme', (e.target as HTMLInputElement).value)
    showThemeSuggestions.value = true
  }

  // Load file metadata when video is selected
  watch(
    () => props.selectedFile,
    async (newFile) => {
      if (newFile && props.directoryHandle) {
        try {
          // Get the file handle
          const fileHandle = await props.directoryHandle.getFileHandle(newFile.name)

          // Get the file object
          const file = await fileHandle.getFile()

          // Get the modified date from the File object (this is built-in)
          const modifiedDate = new Date(file.lastModified)
          const created = modifiedDate.toISOString().replace('T', ' ').substring(0, 19)

          fileMetadata.value = { created }
        } catch (err) {
          console.error('Failed to load file metadata:', err)
          fileMetadata.value = null
        }
      }
    }
  )

  async function getTags() {
    const url = props.webAddress?.trim()
    if (!url) {
      console.warn('No web address provided for tag fetch')
      return
    }

    isLoadingTags.value = true
    try {
      const result = await invoke<{
        url: string
        title: string
        all_h1s: string[]
        creator: string[]
        tags: string[]
        music_artist: string[]
        music_song: string[]
        models: string[]
      }>('fetch_h3_and_spans', { url })

      const newCreator = result.creator[0] || ''
      const newSongName = result.music_song[0] || ''
      const newArtist = result.music_artist.join(', ')
      const newMainGirl = result.models.map((m) => capitalizeLastToken(m)).join(', ')
      const newTheme = result.tags.join(', ')

      $emit('update:creator', props.creator || newCreator)
      $emit('update:songName', props.songName || newSongName)
      $emit('update:artist', props.artist || newArtist)
      $emit('update:mainGirl', props.mainGirl ? `${props.mainGirl}, ${newMainGirl}` : newMainGirl)
      $emit('update:theme', props.theme ? `${props.theme}, ${newTheme}` : newTheme)
    } catch (err) {
      console.error('Failed to fetch tags', err)
    } finally {
      isLoadingTags.value = false
    }
  }

  async function fetchCreator() {
    const url = props.webAddress?.trim()
    if (!url) {
      console.warn('No web address provided for creator fetch')
      return
    }

    isLoadingTags.value = true
    try {
      const result = await invoke<{
        url: string
        title: string
        all_h1s: string[]
        creator: string[]
        tags: string[]
        music_artist: string[]
        music_song: string[]
        models: string[]
      }>('fetch_h3_and_spans', { url })

      const newCreator = result.creator[0] || ''
      if (newCreator) {
        $emit('update:creator', newCreator)
      }
    } catch (err) {
      console.error('Failed to fetch creator', err)
    } finally {
      isLoadingTags.value = false
    }
  }

  async function fetchSongName() {
    const url = props.webAddress?.trim()
    if (!url) {
      console.warn('No web address provided for song name fetch')
      return
    }

    isLoadingTags.value = true
    try {
      const result = await invoke<{
        url: string
        title: string
        all_h1s: string[]
        creator: string[]
        tags: string[]
        music_artist: string[]
        music_song: string[]
        models: string[]
      }>('fetch_h3_and_spans', { url })

      const newSongName = result.music_song[0] || ''
      if (newSongName) {
        $emit('update:songName', newSongName)
      }
    } catch (err) {
      console.error('Failed to fetch song name', err)
    } finally {
      isLoadingTags.value = false
    }
  }

  async function fetchArtist() {
    const url = props.webAddress?.trim()
    if (!url) {
      console.warn('No web address provided for artist fetch')
      return
    }

    isLoadingTags.value = true
    try {
      const result = await invoke<{
        url: string
        title: string
        all_h1s: string[]
        creator: string[]
        tags: string[]
        music_artist: string[]
        music_song: string[]
        models: string[]
      }>('fetch_h3_and_spans', { url })

      const newArtist = result.music_artist.join(', ')
      if (newArtist) {
        $emit('update:artist', newArtist)
      }
    } catch (err) {
      console.error('Failed to fetch artist', err)
    } finally {
      isLoadingTags.value = false
    }
  }

  async function fetchMainGirl() {
    const url = props.webAddress?.trim()
    if (!url) {
      console.warn('No web address provided for main girl fetch')
      return
    }

    isLoadingTags.value = true
    try {
      const result = await invoke<{
        url: string
        title: string
        all_h1s: string[]
        creator: string[]
        tags: string[]
        music_artist: string[]
        music_song: string[]
        models: string[]
      }>('fetch_h3_and_spans', { url })

      const newMainGirl = result.models.map((m) => capitalizeLastToken(m)).join(', ')
      if (newMainGirl) {
        $emit('update:mainGirl', props.mainGirl ? `${props.mainGirl}, ${newMainGirl}` : newMainGirl)
      }
    } catch (err) {
      console.error('Failed to fetch main girl', err)
    } finally {
      isLoadingTags.value = false
    }
  }

  async function fetchTheme() {
    const url = props.webAddress?.trim()
    if (!url) {
      console.warn('No web address provided for theme fetch')
      return
    }

    isLoadingTags.value = true
    try {
      const result = await invoke<{
        url: string
        title: string
        all_h1s: string[]
        creator: string[]
        tags: string[]
        music_artist: string[]
        music_song: string[]
        models: string[]
      }>('fetch_h3_and_spans', { url })

      const newTheme = result.tags.join(', ')
      if (newTheme) {
        $emit('update:theme', props.theme ? `${props.theme}, ${newTheme}` : newTheme)
      }
    } catch (err) {
      console.error('Failed to fetch theme', err)
    } finally {
      isLoadingTags.value = false
    }
  }

  async function fetchVideoTitle() {
    const url = props.webAddress?.trim()
    if (!url) {
      console.warn('No web address provided for video title fetch')
      return
    }

    isLoadingTags.value = true
    try {
      const result = await invoke<{
        url: string
        title: string
        all_h1s: string[]
        creator: string[]
        tags: string[]
        music_artist: string[]
        music_song: string[]
        models: string[]
      }>('fetch_h3_and_spans', { url })

      const newTitle = result.title || ''
      if (newTitle) {
        $emit('update:videoTitle', newTitle)
      }
    } catch (err) {
      console.error('Failed to fetch video title', err)
    } finally {
      isLoadingTags.value = false
    }
  }

  function selectThemeSuggestion(suggestion: string) {
    const currentValue = props.theme
    const lastCommaIndex = currentValue.lastIndexOf(',')

    let newValue: string
    if (lastCommaIndex >= 0) {
      newValue = currentValue.substring(0, lastCommaIndex + 1) + ' ' + suggestion
    } else {
      newValue = suggestion
    }

    $emit('update:theme', newValue)
    showThemeSuggestions.value = false
  }

  const $emit = defineEmits<{
    'update:videoTitle': [value: string]
    'update:creator': [value: string]
    'update:songName': [value: string]
    'update:artist': [value: string]
    'update:webAddress': [value: string]
    'update:mainGirl': [value: string]
    'update:theme': [value: string]
    'update:edit': [value: string]
    'update:delete': [value: string]
    'update:updateForm': [value: string]
    'update:updateFormGirls': [value: string]
    'update:updateFormThemes': [value: string]
    save: []
    'video-deleted': []
  }>()

  function keepVideo() {
    $emit('update:delete', 'no')
    $emit('save')
  }

  async function deleteVideo() {
    if (!props.selectedFile || !props.directoryHandle) {
      console.error('No selected file or directory handle')
      return
    }

    if (isDeleting.value) {
      console.log('Delete already in progress, ignoring')
      return
    }

    isDeleting.value = true
    console.log('Starting deletion for:', props.selectedFile.name)

    try {
      // Delete the file
      await props.directoryHandle.removeEntry(props.selectedFile.name)
      console.log('File deleted from disk:', props.selectedFile.name)

      // Delete from database
      await videoDataService.deleteVideoByFileName(props.selectedFile.name)
      console.log('Deleted from database:', props.selectedFile.name)

      // Notify parent to refresh
      $emit('video-deleted')
      console.log('Deletion complete')
    } catch (err) {
      console.error('Error deleting:', err)
      alert(`Error deleting file: ${err}`)
    } finally {
      isDeleting.value = false
    }
  }
</script>

<style src="../views/TaggingForm.css"></style>
