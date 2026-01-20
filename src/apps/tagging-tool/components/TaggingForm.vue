<template>
  <aside class="right-sidebar">
    <div class="tagging-panel" v-if="selectedFile">
      <h2 class="video-title">{{ selectedFile.name }}</h2>

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
            @focus="showArtistSuggestions = true"
            @blur="hideArtistSuggestions"
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
            @focus="showMainGirlSuggestions = true"
            @blur="hideMainGirlSuggestions"
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
            @focus="showThemeSuggestions = true"
            @blur="hideThemeSuggestions"
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

      <div v-if="saveMessage" class="save-message">{{ saveMessage }}</div>
    </div>
    <div v-else class="empty-state-panel">
      <p>Select a video to tag</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import type { FileItem } from '../../../shared/composables/useFileBrowser'
  import type { VideoMetadata } from '../../../shared/types/media'

  interface Props {
    selectedFile: FileItem | null
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

  const showArtistSuggestions = ref(false)
  const showMainGirlSuggestions = ref(false)
  const showThemeSuggestions = ref(false)

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

  function hideArtistSuggestions() {
    setTimeout(() => {
      showArtistSuggestions.value = false
    }, 200)
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

  function hideMainGirlSuggestions() {
    setTimeout(() => {
      showMainGirlSuggestions.value = false
    }, 200)
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

  function hideThemeSuggestions() {
    setTimeout(() => {
      showThemeSuggestions.value = false
    }, 200)
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

<style scoped>
  .right-sidebar {
    width: 300px;
    padding-top: 50px;
    flex: 0 0 300px;
    background: #494949;
    border-left: 1px solid #e0e0e0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .tagging-panel {
    padding: 1.5rem;
    box-sizing: border-box;
  }

  .video-title {
    margin: 0 0 1.5rem 0;
    color: #333;
    font-size: 1.5rem;
    word-break: break-word;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #555;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 0.95rem;
    font-family: inherit;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: #667eea;
  }

  .autocomplete-wrapper {
    position: relative;
  }

  .autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 200px;
    overflow-y: auto;
    background: white;
    border: 1px solid #667eea;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    margin-top: 2px;
  }

  .autocomplete-item {
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    color: #333;
    font-size: 0.9rem;
  }

  .autocomplete-item:hover {
    background: #f0f0f0;
  }

  .btn-save {
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

  .btn-save:hover {
    background: #5568d3;
  }

  .save-message {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #d4edda;
    color: #155724;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .empty-state-panel {
    padding: 2rem 1.5rem;
    text-align: center;
    color: #999;
    font-size: 0.95rem;
  }
</style>
