<template>
  <div class="demo-container">
    <h1>Vue3 评论编辑器示例</h1>

    <div class="tabs">
      <button
        :class="{ active: activeTab === 'prosemirror' }"
        @click="activeTab = 'prosemirror'"
      >
        ProseMirror 实现
      </button>
      <button
        :class="{ active: activeTab === 'pure' }"
        @click="activeTab = 'pure'"
      >
        纯 JS 实现
      </button>
    </div>

    <div class="tab-content">
      <CommentEditorProseMirror v-if="activeTab === 'prosemirror'" />
      <CommentEditorPure v-if="activeTab === 'pure'" />
    </div>

    <div class="features">
      <h3>功能说明</h3>
      <div class="feature-comparison">
        <div class="feature-column">
          <h4>ProseMirror 实现</h4>
          <ul>
            <li>✅ 基于专业的富文本编辑器框架</li>
            <li>✅ 强大的文档模型和插件系统</li>
            <li>✅ 支持协同编辑（可扩展）</li>
            <li>✅ 更好的性能和稳定性</li>
            <li>✅ 丰富的 API 和生态系统</li>
            <li>⚠️ 需要学习 ProseMirror 概念</li>
            <li>⚠️ 包体积较大</li>
          </ul>
        </div>
        <div class="feature-column">
          <h4>纯 JS 实现</h4>
          <ul>
            <li>✅ 无需额外依赖</li>
            <li>✅ 轻量级实现</li>
            <li>✅ 完全可控的代码</li>
            <li>✅ 易于理解和定制</li>
            <li>⚠️ 需要处理更多边界情况</li>
            <li>⚠️ 跨浏览器兼容性需要额外处理</li>
            <li>⚠️ 复杂场景下可能不够稳定</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="usage-guide">
      <h3>使用方法</h3>
      <ol>
        <li>在编辑器中选中任意文本</li>
        <li>会自动弹出评论对话框</li>
        <li>输入评论内容并提交</li>
        <li>选中的文本会被高亮标记</li>
        <li>在评论列表中可以查看、定位和删除评论</li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CommentEditorProseMirror from './components/CommentEditorProseMirror.vue'
import CommentEditorPure from './components/CommentEditorPure.vue'

const activeTab = ref<'prosemirror' | 'pure'>('prosemirror')
</script>

<style scoped>
.demo-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.tabs button {
  padding: 12px 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
}

.tabs button:hover {
  color: #007bff;
}

.tabs button.active {
  color: #007bff;
  border-bottom-color: #007bff;
  font-weight: 600;
}

.tab-content {
  margin-bottom: 40px;
}

.features {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.features h3 {
  margin-top: 0;
  color: #2c3e50;
}

.feature-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.feature-column {
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.feature-column h4 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 8px;
}

.feature-column ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-column li {
  padding: 6px 0;
  line-height: 1.6;
}

.usage-guide {
  background: #e7f3ff;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.usage-guide h3 {
  margin-top: 0;
  color: #2c3e50;
}

.usage-guide ol {
  margin: 10px 0 0 20px;
  line-height: 1.8;
}

@media (max-width: 768px) {
  .feature-comparison {
    grid-template-columns: 1fr;
  }
}
</style>
