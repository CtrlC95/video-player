<template>
  <aside class="sidebar left">
    <div class="sidebar-content">
      <button class="btn-select" @click="emit('selectDirectory')">
        {{ currentPath ? 'Change Directory' : 'Select Directory' }}
      </button>
      <template v-if="currentPath">
        <select
          v-model="localFilterBy"
          class="filter-select"
          @change="emit('filterChange', localFilterBy)"
        >
          <option value="all">All Videos</option>
          <option value="untagged">Untagged Videos</option>
        </select>

        <div v-if="localFilterBy === 'all'" class="search-box">
          <div class="filter-options">
            <div class="missing-toggles">
              <div class="filter-field">
                <span class="field-name">Creator</span>
                <div class="checkbox-pair">
                  <label class="checkbox-label" title="Missing">
                    <input
                      type="checkbox"
                      :checked="fieldFilters.creator?.missing"
                      @change="toggleFieldFilter('creator', 'missing')"
                    />
                    M
                  </label>
                  <label class="checkbox-label" title="Exists">
                    <input
                      type="checkbox"
                      :checked="fieldFilters.creator?.exists"
                      @change="toggleFieldFilter('creator', 'exists')"
                    />
                    E
                  </label>
                </div>
              </div>

              <div class="filter-field">
                <span class="field-name">Song Name</span>
                <div class="checkbox-pair">
                  <label class="checkbox-label" title="Missing">
                    <input
                      type="checkbox"
                      :checked="fieldFilters.songName?.missing"
                      @change="toggleFieldFilter('songName', 'missing')"
                    />
                    M
                  </label>
                  <label class="checkbox-label" title="Exists">
                    <input
                      type="checkbox"
                      :checked="fieldFilters.songName?.exists"
                      @change="toggleFieldFilter('songName', 'exists')"
                    />
                    E
                  </label>
                </div>
              </div>

              <div class="filter-field">
                <span class="field-name">Artist</span>
                <div class="checkbox-pair">
                  <label class="checkbox-label" title="Missing">
                    <input
                      type="checkbox"
                      :checked="fieldFilters.artist?.missing"
                      @change="toggleFieldFilter('artist', 'missing')"
                    />
                    M
                  </label>
                  <label class="checkbox-label" title="Exists">
                    <input
                      type="checkbox"
                      :checked="fieldFilters.artist?.exists"
                      @change="toggleFieldFilter('artist', 'exists')"
                    />
                    E
                  </label>
                </div>
              </div>

              <div class="filter-field">
                <span class="field-name">Web Address</span>
                <div class="checkbox-pair">
                  <label class="checkbox-label" title="Missing">
                    <input
                      type="checkbox"
                      :checked="fieldFilters.webAddress?.missing"
                      @change="toggleFieldFilter('webAddress', 'missing')"
                    />
                    M
                  </label>
                  <label class="checkbox-label" title="Exists">
                    <input
                      type="checkbox"
                      :checked="fieldFilters.webAddress?.exists"
                      @change="toggleFieldFilter('webAddress', 'exists')"
                    />
                    E
                  </label>
                </div>
              </div>

              <div class="filter-field">
                <span class="field-name">Main Girl</span>
                <div class="checkbox-pair">
                  <label class="checkbox-label" title="Missing">
                    <input
                      type="checkbox"
                      :checked="fieldFilters.mainGirl?.missing"
                      @change="toggleFieldFilter('mainGirl', 'missing')"
                    />
                    M
                  </label>
                  <label class="checkbox-label" title="Exists">
                    <input
                      type="checkbox"
                      :checked="fieldFilters.mainGirl?.exists"
                      @change="toggleFieldFilter('mainGirl', 'exists')"
                    />
                    E
                  </label>
                </div>
              </div>

              <div class="filter-field">
                <span class="field-name">Theme</span>
                <div class="checkbox-pair">
                  <label class="checkbox-label" title="Missing">
                    <input
                      type="checkbox"
                      :checked="fieldFilters.theme?.missing"
                      @change="toggleFieldFilter('theme', 'missing')"
                    />
                    M
                  </label>
                  <label class="checkbox-label" title="Exists">
                    <input
                      type="checkbox"
                      :checked="fieldFilters.theme?.exists"
                      @change="toggleFieldFilter('theme', 'exists')"
                    />
                    E
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="search-field-radios">
            <label class="radio-label">
              <input
                type="radio"
                v-model="searchField"
                value="creator"
                @change="emitSearchChange"
              />
              Creator
            </label>
            <label class="radio-label">
              <input type="radio" v-model="searchField" value="song" @change="emitSearchChange" />
              Song
            </label>
          </div>

          <div v-if="searchField === 'creator'" class="search-inputs">
            <input
              v-model="creatorSearch"
              type="text"
              placeholder="Search creator..."
              class="search-input"
              list="creator-suggestions"
              @input="emitSearchChange"
            />
            <datalist id="creator-suggestions">
              <option v-for="creator in props.uniqueCreators" :key="creator" :value="creator" />
            </datalist>
          </div>

          <div v-if="searchField === 'song'" class="search-inputs">
            <input
              v-model="songSearch"
              type="text"
              placeholder="Search song title..."
              class="search-input"
              list="song-suggestions"
              @input="emitSearchChange"
            />
            <datalist id="song-suggestions">
              <option v-for="song in props.uniqueSongs" :key="song" :value="song" />
            </datalist>
            <input
              v-model="artistSearch"
              type="text"
              placeholder="Search artist..."
              class="search-input"
              list="artist-suggestions"
              @input="emitSearchChange"
            />
            <datalist id="artist-suggestions">
              <option v-for="artist in props.uniqueArtists" :key="artist" :value="artist" />
            </datalist>
          </div>
        </div>

        <div class="video-count">
          {{ filteredFiles.length }} video{{ filteredFiles.length !== 1 ? 's' : '' }}
        </div>

        <div v-if="filteredFiles.length > 0" class="file-list">
          <div
            v-for="file in filteredFiles"
            :key="file.name"
            class="file-item"
            :class="{
              selected: selectedFile?.name === file.name,
              'not-in-database': !isFileInDatabase(file.name),
            }"
            @click="emit('selectFile', file)"
          >
            <span class="file-icon">{{ file.isDirectory ? '📁' : '📄' }}</span>
            <span class="file-name">{{ file.name }}</span>
          </div>
        </div>

        <div v-else class="empty-state-sidebar">
          <p>No untagged videos found</p>
        </div>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import type { FileItem } from '../../../shared/composables/useFileBrowser'
  import type { VideoMetadata } from '../../../shared/types/media'

  interface Props {
    currentPath: string
    filteredFiles: FileItem[]
    selectedFile: FileItem | null
    filterBy: 'all' | 'untagged' | 'missing'
    videosInDatabase: VideoMetadata[]
    uniqueCreators: string[]
    uniqueSongs: string[]
    uniqueArtists: string[]
  }

  const props = defineProps<Props>()

  const localFilterBy = ref(props.filterBy)
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

  watch(
    () => props.filterBy,
    (newVal) => {
      localFilterBy.value = newVal
    }
  )

  function toggleFieldFilter(field: string, type: 'missing' | 'exists') {
    if (fieldFilters.value[field]) {
      fieldFilters.value[field][type] = !fieldFilters.value[field][type]
      emitFilterChange()
    }
  }

  function emitFilterChange() {
    emit('fieldFiltersChange', fieldFilters.value)
  }

  function isFileInDatabase(fileName: string): boolean {
    return props.videosInDatabase.some((v) => v.fileName === fileName)
  }

  interface FieldFilterState {
    missing: boolean
    exists: boolean
  }

  const emit = defineEmits<{
    selectDirectory: []
    filterChange: [value: string]
    fieldFiltersChange: [filters: Record<string, FieldFilterState>]
    searchChange: [searchField: string, creatorTerm: string, songTerm: string, artistTerm: string]
    selectFile: [file: FileItem]
  }>()

  function emitSearchChange() {
    emit(
      'searchChange',
      searchField.value,
      creatorSearch.value,
      songSearch.value,
      artistSearch.value
    )
  }
</script>

<style src="../views/FileListSidebar.css"></style>
