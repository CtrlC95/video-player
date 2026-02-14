<template>
  <aside class="right-sidebar">
    <div class="tagging-panel" v-if="selectedFile">
      <h2 class="video-title">{{ selectedFile.name }}</h2>

      <div v-if="fileMetadata" class="file-info">
        <p :class="{ 'date-old': isDateOld, 'date-recent': isDateRecent }">
          <strong>Created:</strong> {{ fileMetadata.created }}
        </p>
      </div>

      <div class="form-group">
        <label>Creator</label>
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
        <label>Song Name</label>
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
        <label>Artist</label>
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

      <button class="btn-save" @click="$emit('save')">Save</button>
      <button class="btn-secondary" @click="getTags" :disabled="isLoadingTags">
        {{ isLoadingTags ? 'Loading...' : 'Get tags' }}
      </button>

      <div v-if="saveMessage" class="save-message">{{ saveMessage }}</div>
      <div v-if="isLoadingTags" class="loading-message">Fetching tags from website...</div>
    </div>
    <div v-else class="empty-state-panel">
      <p>Select a video to tag</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { invoke } from '@tauri-apps/api/core'
  import { ref, computed, watch } from 'vue'
  import type { FileItem } from '../../../shared/composables/useFileBrowser'

  const isLoadingTags = ref(false)
  const fileMetadata = ref<{ created: string } | null>(null)
  import type { VideoMetadata } from '../../../shared/types/media'

  interface Props {
    selectedFile: FileItem | null
    directoryHandle: any
    creator: string
    songName: string
    artist: string
    webAddress: string
    mainGirl: string
    theme: string
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
    'update:creator': [value: string]
    'update:songName': [value: string]
    'update:artist': [value: string]
    'update:webAddress': [value: string]
    'update:mainGirl': [value: string]
    'update:theme': [value: string]
    save: []
  }>()
</script>

<style src="../views/TaggingForm.css"></style>
