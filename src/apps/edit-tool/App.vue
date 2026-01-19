<template>
  <div class="edit-tool-app">
    <div class="edit-container">
      <div class="browser">
        <div class="browser-header">
          <button class="btn-select" @click="selectDirectory">
            {{ currentPath ? 'Change Directory' : 'Select Directory' }}
          </button>
        </div>

        <div v-if="files.length > 0" class="file-list">
          <div v-for="file in files" :key="file.name" class="file-item">
            <span class="file-icon">{{ file.isDirectory ? '📁' : '📄' }}</span>
            <span class="file-name">{{ file.name }}</span>
          </div>
        </div>

        <div v-else-if="currentPath" class="empty-state">
          <p>No files found in this directory</p>
        </div>

        <div v-else class="empty-state">
          <p>Select a directory to browse</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useFileBrowser } from '../../shared/composables/useFileBrowser'

  const { currentPath, files, selectDirectory } = useFileBrowser()
</script>

<style scoped>
  .edit-tool-app {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .edit-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .browser {
    width: 100%;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .browser-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .btn-select {
    padding: 0.75rem 1.5rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: background 0.2s ease;
  }

  .btn-select:hover {
    background: #5568d3;
  }

  .path-display {
    padding: 0.75rem 1rem;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 0.9rem;
    color: #666;
    word-break: break-all;
  }

  .file-list {
    border: 1px solid #ddd;
    border-radius: 4px;
    max-height: 400px;
    overflow-y: auto;
  }

  .file-item {
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .file-item:last-child {
    border-bottom: none;
  }

  .file-item:hover {
    background: #f9f9f9;
  }

  .file-icon {
    font-size: 1.2rem;
    min-width: 24px;
  }

  .file-name {
    color: #333;
    font-size: 0.95rem;
  }

  .empty-state {
    padding: 2rem;
    text-align: center;
    color: #999;
  }
</style>
