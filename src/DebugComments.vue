<template>
  <div class="debug-wrapper">
    <h1>评论功能调试页面</h1>

    <div class="controls">
      <button @click="clearStorage" class="clear-btn">清除本地存储</button>
      <button @click="showDebugInfo" class="debug-btn">显示调试信息</button>
    </div>

    <div class="test-sections">
      <div class="section">
        <h2>纯 JS 实现</h2>
        <CommentEditorPure />
      </div>

      <div class="section">
        <h2>ProseMirror 实现</h2>
        <CommentEditorProseMirror />
      </div>
    </div>

    <div v-if="debugInfo" class="debug-info">
      <h3>调试信息</h3>
      <pre>{{ debugInfo }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CommentEditorPure from './components/CommentEditorPure.vue'
import CommentEditorProseMirror from './components/CommentEditorProseMirror.vue'

const debugInfo = ref('')

const clearStorage = () => {
  if (confirm('确定要清除所有本地存储的评论和内容吗？')) {
    localStorage.removeItem('pure-comments')
    localStorage.removeItem('pure-content')
    localStorage.removeItem('prosemirror-comments')
    localStorage.removeItem('prosemirror-content')
    alert('已清除本地存储，请刷新页面')
    location.reload()
  }
}

const showDebugInfo = () => {
  const info = {
    pureComments: localStorage.getItem('pure-comments'),
    pureContent: localStorage.getItem('pure-content'),
    prosemirrorComments: localStorage.getItem('prosemirror-comments'),
    prosemirrorContent: localStorage.getItem('prosemirror-content')
  }
  debugInfo.value = JSON.stringify(info, null, 2)
}
</script>

<style scoped>
.debug-wrapper {
  max-width: 1800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 30px;
}

.controls button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.clear-btn {
  background: #dc3545;
  color: white;
}

.clear-btn:hover {
  background: #c82333;
}

.debug-btn {
  background: #17a2b8;
  color: white;
}

.debug-btn:hover {
  background: #138496;
}

.test-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

.section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.section h2 {
  margin-top: 0;
  color: #495057;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.debug-info {
  background: #2d2d2d;
  color: #f8f8f2;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.debug-info h3 {
  margin-top: 0;
  color: #f8f8f2;
}

.debug-info pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

@media (max-width: 1400px) {
  .test-sections {
    grid-template-columns: 1fr;
  }
}
</style>
