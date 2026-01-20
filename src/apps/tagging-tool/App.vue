<template>
  <div class="tagging-tool-app" @keydown="handleKeydown">
    <FileListSidebar
      :current-path="currentPath"
      :filtered-files="filteredFiles"
      :selected-file="selectedFile"
      :filter-by="filterBy"
      :videos-in-database="videosInDatabase"
      :unique-creators="uniqueCreators"
      :unique-songs="uniqueSongs"
      :unique-artists="uniqueArtistsForSearch"
      @select-directory="handleSelectDirectory"
      @filter-change="filterBy = $event"
      @field-filters-change="fieldFilters = $event"
      @search-change="
        (field, creator, song, artist) => {
          searchField = field
          creatorSearch = creator
          songSearch = song
          artistSearch = artist
        }
      "
      @select-file="selectFile"
    />

    <VideoPlayer
      :current-path="currentPath"
      :selected-file="selectedFile"
      :directory-handle="directoryHandle"
    />

    <TaggingForm
      :selected-file="selectedFile"
      :creator="creator"
      :song-name="songName"
      :artist="artist"
      :web-address="webAddress"
      :main-girl="mainGirl"
      :theme="theme"
      :save-message="saveMessage"
      :videos-in-database="videosInDatabase"
      :unique-creators="uniqueCreators"
      :unique-main-girls="uniqueMainGirls"
      :unique-themes="uniqueThemes"
      @update:creator="creator = $event"
      @update:song-name="songName = $event"
      @update:artist="artist = $event"
      @update:web-address="webAddress = $event"
      @update:main-girl="mainGirl = $event"
      @update:theme="theme = $event"
      @save="saveTags"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useVideoFileBrowser } from '../../shared/composables/useFileBrowser'
  import type { FileItem } from '../../shared/composables/useFileBrowser'
  import { videoDataService } from '../../shared/services/videoDataService'
  import type { VideoMetadata } from '../../shared/types/media'
  import FileListSidebar from './components/FileListSidebar.vue'
  import VideoPlayer from './components/VideoPlayer.vue'
  import TaggingForm from './components/TaggingForm.vue'

  defineOptions({
    name: 'TaggingToolApp',
  })

  const { currentPath, files, selectDirectory, directoryHandle } = useVideoFileBrowser()

  // Form state
  const selectedFile = ref<FileItem | null>(null)
  const creator = ref('')
  const songName = ref('')
  const artist = ref('')
  const webAddress = ref('')
  const mainGirl = ref('')
  const theme = ref('')
  const saveMessage = ref('')

  // Database and filter state
  const isInitialized = ref(false)
  const videosInDatabase = ref<VideoMetadata[]>([])
  const filterBy = ref<'all' | 'untagged' | 'missing'>('all')
  const searchField = ref('creator')
  const creatorSearch = ref('')
  const songSearch = ref('')
  const artistSearch = ref('')

  interface FieldFilterState {
    missing: boolean
    exists: boolean
  }

  const fieldFilters = ref<Record<string, FieldFilterState>>({
    creator: { missing: false, exists: false },
    songName: { missing: false, exists: false },
    artist: { missing: false, exists: false },
    webAddress: { missing: false, exists: false },
    mainGirl: { missing: false, exists: false },
    theme: { missing: false, exists: false },
  })

  // Computed properties for unique values
  const uniqueCreators = computed(() => {
    const creatorSet = new Set<string>()
    videosInDatabase.value.forEach((video) => {
      if (video.creator) creatorSet.add(video.creator)
    })
    return Array.from(creatorSet).sort()
  })

  const uniqueMainGirls = computed(() => {
    const girlSet = new Set<string>()
    videosInDatabase.value.forEach((video) => {
      if (video.mainGirl) girlSet.add(video.mainGirl)
    })
    return Array.from(girlSet).sort()
  })

  const uniqueThemes = computed(() => {
    const themeSet = new Set<string>()
    videosInDatabase.value.forEach((video) => {
      if (video.theme) themeSet.add(video.theme)
    })
    return Array.from(themeSet).sort()
  })

  const uniqueSongs = computed(() => {
    const songSet = new Set<string>()
    videosInDatabase.value.forEach((video) => {
      if (video.songName) songSet.add(video.songName)
    })
    return Array.from(songSet).sort()
  })

  const uniqueArtistsForSearch = computed(() => {
    const artistSet = new Set<string>()
    videosInDatabase.value.forEach((video) => {
      if (video.artist) artistSet.add(video.artist)
    })
    return Array.from(artistSet).sort()
  })

  // Filter files based on database status and selected filter
  const filteredFiles = computed(() => {
    let result: any[] = []

    // Show all database entries
    if (filterBy.value === 'all') {
      result = videosInDatabase.value
        .filter((video) => {
          if (searchField.value === 'creator') {
            if (!creatorSearch.value) return true
            return video.creator.toLowerCase().includes(creatorSearch.value.toLowerCase())
          } else if (searchField.value === 'song') {
            const hasSongTerm = songSearch.value.length > 0
            const hasArtistTerm = artistSearch.value.length > 0

            if (!hasSongTerm && !hasArtistTerm) return true

            const songMatch =
              !hasSongTerm || video.songName.toLowerCase().includes(songSearch.value.toLowerCase())
            const artistMatch =
              !hasArtistTerm ||
              video.artist.toLowerCase().includes(artistSearch.value.toLowerCase())

            return songMatch && artistMatch
          }
          return true
        })
        .map((video) => ({
          name: video.fileName,
          isDirectory: false,
          fullPath: video.fileName,
          handle: null,
        }))
    }
    // Show untagged videos (not in database)
    else if (filterBy.value === 'untagged') {
      result = files.value.filter((file) => !isFileInDatabase(file.name))
    }
    // Show database entries with missing specific fields
    else if (filterBy.value === 'missing') {
      result = videosInDatabase.value
        .filter((video) => {
          const hasActiveFilter = Object.values(fieldFilters.value).some(
            (f) => f.missing || f.exists
          )

          if (!hasActiveFilter) return false

          const checkField = (field: string, fieldValue: string | undefined): boolean => {
            const filter = fieldFilters.value[field]
            const isEmpty = !fieldValue

            if (!filter.missing && !filter.exists) return false

            if (filter.missing && filter.exists) return true

            if (filter.missing) return isEmpty

            if (filter.exists) return !isEmpty

            return false
          }

          return (
            checkField('creator', video.creator) ||
            checkField('songName', video.songName) ||
            checkField('artist', video.artist) ||
            checkField('webAddress', video.webAddress) ||
            checkField('mainGirl', video.mainGirl) ||
            checkField('theme', video.theme)
          )
        })
        .map((video) => ({
          name: video.fileName,
          isDirectory: false,
          fullPath: video.fileName,
          handle: null,
        }))
    }

    return result
  })

  // Directory selection
  async function handleSelectDirectory() {
    await selectDirectory()
    if (directoryHandle.value) {
      await videoDataService.initialize(directoryHandle.value)
      videosInDatabase.value = await videoDataService.loadVideos()
      isInitialized.value = true
    }
  }

  // Check if file is in database
  function isFileInDatabase(fileName: string): boolean {
    return videosInDatabase.value.some((v) => v.fileName === fileName)
  }

  // Select and load file
  async function selectFile(file: FileItem) {
    selectedFile.value = file
    saveMessage.value = ''

    if (isInitialized.value) {
      const existingData = await videoDataService.getVideoByFileName(file.name)
      if (existingData) {
        creator.value = existingData.creator
        songName.value = existingData.songName
        artist.value = existingData.artist
        webAddress.value = existingData.webAddress
        mainGirl.value = existingData.mainGirl || ''
        theme.value = existingData.theme || ''
      } else {
        parseFilename(file.name)
      }
    } else {
      parseFilename(file.name)
    }
  }

  // Parse filename to auto-fill fields
  function parseFilename(filename: string) {
    let nameWithoutExt = filename.split('.').slice(0, -1).join('.')

    const pmvIndex = nameWithoutExt.search(/\s+(PMV|PMW)/i)
    if (pmvIndex !== -1) {
      nameWithoutExt = nameWithoutExt.substring(0, pmvIndex)
    }

    if (nameWithoutExt.includes(' - ')) {
      const parts = nameWithoutExt.split(' - ')
      if (parts.length >= 2) {
        songName.value = parts[0].trim()
        artist.value = parts[1].trim()
        creator.value = ''
        webAddress.value = ''
        mainGirl.value = ''
        theme.value = ''
      }
    } else {
      creator.value = ''
      songName.value = ''
      artist.value = ''
      webAddress.value = ''
      mainGirl.value = ''
      theme.value = ''
    }
  }

  // Save tags to database
  async function saveTags() {
    if (!selectedFile.value) return

    const currentIndex = filteredFiles.value.findIndex((f) => f.name === selectedFile.value?.name)
    const nextFile =
      currentIndex < filteredFiles.value.length - 1 ? filteredFiles.value[currentIndex + 1] : null

    const videoData: VideoMetadata = {
      fileName: selectedFile.value.name,
      creator: creator.value,
      songName: songName.value,
      artist: artist.value,
      webAddress: webAddress.value,
      mainGirl: mainGirl.value,
      theme: theme.value,
      weightScore: 1,
      delete: 'no',
      edit: 'no',
    }

    if (isInitialized.value) {
      await videoDataService.addOrUpdateVideo(videoData)
      videosInDatabase.value = await videoDataService.loadVideos()
      saveMessage.value = 'Saved to videos.json!'

      if (nextFile) {
        selectFile(nextFile)
      }
    } else {
      console.log('Video data:', videoData)
      saveMessage.value = 'Saved! (Check console)'
    }

    setTimeout(() => {
      saveMessage.value = ''
    }, 3000)
  }

  // Keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const currentIndex = filteredFiles.value.findIndex((f) => f.name === selectedFile.value?.name)
      if (currentIndex > 0) {
        selectFile(filteredFiles.value[currentIndex - 1])
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      const currentIndex = filteredFiles.value.findIndex((f) => f.name === selectedFile.value?.name)
      if (currentIndex < filteredFiles.value.length - 1) {
        selectFile(filteredFiles.value[currentIndex + 1])
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      saveTags()
    }
  }
</script>

<style scoped>
  .tagging-tool-app {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
  }
</style>
