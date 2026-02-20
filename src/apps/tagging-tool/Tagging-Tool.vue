<template>
  <div class="handle-keydown" @keydown="handleKeydown">
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
      @filter-change="filterBy = $event as 'all' | 'untagged' | 'missing'"
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
      :directory-handle="directoryHandle"
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
  import { selectedVideoName } from '../../shared/state/videoSelection'
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
      if (video.mainGirl) {
        if (Array.isArray(video.mainGirl)) {
          video.mainGirl.forEach((girl) => {
            const trimmed = girl.trim()
            if (trimmed) girlSet.add(trimmed)
          })
        } else if (typeof video.mainGirl === 'string') {
          video.mainGirl.split(',').forEach((girl) => {
            const trimmed = girl.trim()
            if (trimmed) girlSet.add(trimmed)
          })
        }
      }
    })
    return Array.from(girlSet).sort()
  })

  const uniqueThemes = computed(() => {
    const themeSet = new Set<string>()
    videosInDatabase.value.forEach((video) => {
      if (video.theme) {
        if (Array.isArray(video.theme)) {
          video.theme.forEach((theme) => {
            const trimmed = theme.trim()
            if (trimmed) themeSet.add(trimmed)
          })
        } else if (typeof video.theme === 'string') {
          video.theme.split(',').forEach((theme) => {
            const trimmed = theme.trim()
            if (trimmed) themeSet.add(trimmed)
          })
        }
      }
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

    // Show all database entries with search and missing field filters combined
    if (filterBy.value === 'all') {
      result = videosInDatabase.value
        .filter((video) => {
          // Apply search filters
          let searchMatches = true
          if (searchField.value === 'creator') {
            if (creatorSearch.value) {
              searchMatches = video.creator
                .toLowerCase()
                .includes(creatorSearch.value.toLowerCase())
            }
          } else if (searchField.value === 'song') {
            const hasSongTerm = songSearch.value.length > 0
            const hasArtistTerm = artistSearch.value.length > 0

            if (hasSongTerm || hasArtistTerm) {
              const songMatch =
                !hasSongTerm ||
                video.songName.toLowerCase().includes(songSearch.value.toLowerCase())
              const artistMatch =
                !hasArtistTerm ||
                video.artist.toLowerCase().includes(artistSearch.value.toLowerCase())
              searchMatches = songMatch && artistMatch
            }
          }

          // Apply missing field filters
          const hasActiveFilter = Object.values(fieldFilters.value).some(
            (f) => f.missing || f.exists
          )

          let fieldFilterMatches = true
          if (hasActiveFilter) {
            const checkField = (
              field: string,
              fieldValue: string | string[] | undefined
            ): boolean => {
              const filter = fieldFilters.value[field]
              if (!filter) return true
              const isEmpty = !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)

              if (!filter.missing && !filter.exists) return true

              if (filter.missing && filter.exists) return true

              if (filter.missing) return isEmpty

              if (filter.exists) return !isEmpty

              return false
            }

            fieldFilterMatches =
              checkField('creator', video.creator) &&
              checkField('songName', video.songName) &&
              checkField('artist', video.artist) &&
              checkField('webAddress', video.webAddress) &&
              checkField('mainGirl', video.mainGirl) &&
              checkField('theme', video.theme)
          }

          return searchMatches && fieldFilterMatches
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

    return result
  })

  async function initializeFromDirectoryHandle(handle: any) {
    await videoDataService.initialize(handle)
    videosInDatabase.value = await videoDataService.loadVideos()
    isInitialized.value = true
  }

  watch(
    directoryHandle,
    async (newHandle) => {
      if (newHandle) {
        await initializeFromDirectoryHandle(newHandle)
      }
    },
    { immediate: true }
  )

  // Directory selection
  async function handleSelectDirectory() {
    await selectDirectory()
    if (directoryHandle.value) {
      await initializeFromDirectoryHandle(directoryHandle.value)
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
    selectedVideoName.value = file.name

    if (isInitialized.value) {
      const existingData = await videoDataService.getVideoByFileName(file.name)
      if (existingData) {
        creator.value = existingData.creator
        songName.value = existingData.songName
        artist.value = existingData.artist
        webAddress.value = existingData.webAddress
        mainGirl.value = Array.isArray(existingData.mainGirl)
          ? existingData.mainGirl.join(', ')
          : existingData.mainGirl || ''
        theme.value = Array.isArray(existingData.theme)
          ? existingData.theme.join(', ')
          : existingData.theme || ''
      } else {
        parseFilename(file.name)
      }
    } else {
      parseFilename(file.name)
    }
  }

  watch(
    [selectedVideoName, files, directoryHandle],
    async ([name, fileList, handle]) => {
      if (!name || !handle) return
      if (selectedFile.value?.name === name) return

      if (!isInitialized.value) {
        await initializeFromDirectoryHandle(handle)
      }

      const match = fileList.find((file) => file.name === name)
      if (match) {
        await selectFile(match)
      }
    },
    { immediate: true }
  )

  // Parse filename to auto-fill fields
  function parseFilename(filename: string) {
    let nameWithoutExt = filename.split('.').slice(0, -1).join('.')

    const pmvIndex = nameWithoutExt.search(/\s+(PMV|PMW)/i)
    if (pmvIndex !== -1) {
      nameWithoutExt = nameWithoutExt.substring(0, pmvIndex)
    }

    if (nameWithoutExt.includes(' - ')) {
      const parts = nameWithoutExt.split(' - ')
      if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
        songName.value = parts[0]?.trim() ?? ''
        artist.value = parts[1]?.trim() ?? ''
        creator.value = ''
        webAddress.value = ''
        mainGirl.value = ''
        theme.value = ''
      } else {
        songName.value = ''
        artist.value = ''
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

    const mainGirlArray = mainGirl.value
      .split(',')
      .map((g) => g.trim())
      .filter((g) => g)

    const themeArray = theme.value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t)

    const uniqueSortedMainGirl = Array.from(new Set(mainGirlArray)).sort()
    const uniqueSortedTheme = Array.from(new Set(themeArray)).sort()

    const existingData = await videoDataService.getVideoByFileName(selectedFile.value.name)

    const videoData: VideoMetadata = {
      fileName: selectedFile.value.name,
      creator: creator.value,
      songName: songName.value,
      artist: artist.value,
      webAddress: webAddress.value,
      mainGirl: uniqueSortedMainGirl,
      theme: uniqueSortedTheme,
      weightScore: 1,
      delete: existingData?.delete ?? 'no',
      edit: existingData?.edit ?? 'option1',
      updateForm: existingData?.updateForm ?? 'option1',
      updateFormGirls: existingData?.updateFormGirls ?? '',
      updateFormThemes: existingData?.updateFormThemes ?? '',
    }

    // Update form fields with cleaned values
    mainGirl.value = uniqueSortedMainGirl.join(', ')
    theme.value = uniqueSortedTheme.join(', ')

    if (isInitialized.value) {
      await videoDataService.addOrUpdateVideo(videoData)
      videosInDatabase.value = await videoDataService.loadVideos()
      saveMessage.value = 'Saved to videos.json!'
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
  .handle-keydown {
    display: contents;
  }
</style>
