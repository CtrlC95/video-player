<template>
  <aside class="sidebar">
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

<style scoped>
  .sidebar {
    width: 300px;
    padding-top: 24px;
    background: rgba(31, 41, 55, 0.92);
    border-right: 1px solid rgba(255, 255, 255, 0.12);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: calc(100vh - 24px);
    color: #f9fafb;
    box-shadow: 8px 0 20px rgba(0, 0, 0, 0.2);
  }

  .sidebar-content {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .btn-select {
    padding: 0.75rem 1rem;
    background: #667eea;
    color: #fff;
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
    padding: 0.65rem 1rem;
    background: rgba(255, 255, 255, 0.12);
    color: #f9fafb;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: background 0.2s ease;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .filter-select {
    width: 100%;
    padding: 0.7rem 0.75rem;
    background: rgba(255, 255, 255, 0.08);
    color: #f9fafb;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .filter-select option {
    color: #111827;
  }

  .search-box {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-input {
    width: 100%;
    padding: 0.7rem 0.75rem;
    background: rgba(255, 255, 255, 0.08);
    color: #f9fafb;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .search-field-radios {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-field-radios .radio-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #e5e7eb;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .search-field-radios .radio-label input[type='radio'] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    margin: 0;
  }

  .search-inputs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-input {
    width: 100%;
    padding: 0.7rem 0.75rem;
    background: rgba(255, 255, 255, 0.08);
    color: #f9fafb;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .video-count {
    padding: 0.5rem 0.75rem;
    color: #cbd5f5;
    font-size: 0.85rem;
    text-align: center;
  }

  .file-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .file-list::-webkit-scrollbar {
    display: none;
  }

  .file-item {
    padding: 0.65rem 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .file-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .file-item.selected {
    background: rgba(102, 126, 234, 0.6);
    color: #fff;
  }

  .file-icon {
    font-size: 1rem;
    min-width: 20px;
  }

  .file-name {
    color: #f9fafb;
    font-size: 0.85rem;
    word-break: break-word;
  }

  .file-item.selected .file-name {
    color: white;
  }

  .file-item.not-in-database .file-name {
    color: #fca5a5 !important;
    font-weight: 600;
  }

  .file-item.selected.not-in-database .file-name {
    color: white !important;
  }

  .empty-state-sidebar {
    padding: 1rem;
    text-align: center;
    color: #cbd5f5;
    font-size: 0.95rem;
  }

  .filter-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: rgba(17, 24, 39, 0.65);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    margin-top: 0.5rem;
  }

  .missing-toggles {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .filter-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .field-name {
    color: #fff;
    font-size: 0.9rem;
    flex: 1;
  }

  .checkbox-pair {
    display: flex;
    gap: 0.5rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    color: #f9fafb;
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.3rem 0.5rem;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    user-select: none;
    transition: background 0.2s ease;
  }

  .checkbox-label:hover {
    background: rgba(255, 255, 255, 0.18);
  }

  .checkbox-label input[type='checkbox'] {
    cursor: pointer;
    width: 14px;
    height: 14px;
    margin: 0;
  }
</style>
