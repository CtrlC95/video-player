<template>
  <div class="edit-tool-app">
    <div class="edit-layout">
      <LeftSidebar />
      <VideoEdit />
      <RightSidebar />
    </div>
  </div>
</template>

<script setup lang="ts">
  import LeftSidebar from './components/LeftSidebar.vue'
  import RightSidebar from './components/RightSidebar.vue'
  import VideoEdit from './components/VideoEdit.vue'
</script>

<style src="./editTool.css"></style>
