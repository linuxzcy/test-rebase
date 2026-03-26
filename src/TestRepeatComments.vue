<template>
  <div class="test-wrapper">
    <h1>重复评论测试</h1>

    <div class="test-instructions">
      <h3>测试步骤：</h3>
      <ol>
        <li>选中文本 "测试文本" 添加第一个评论（会显示黄色高亮）</li>
        <li>再次选中相同的 "测试文本" 添加第二个评论（会叠加蓝色高亮）</li>
        <li>再次选中相同的 "测试文本" 添加第三个评论（会叠加绿色高亮）</li>
        <li>删除第二个评论，观察：
          <ul>
            <li>✅ 蓝色高亮应该被移除</li>
            <li>✅ 黄色和绿色高亮应该保留</li>
            <li>✅ 文本内容不受影响</li>
          </ul>
        </li>
        <li>删除第一个评论，观察：
          <ul>
            <li>✅ 黄色高亮应该被移除</li>
            <li>✅ 绿色高亮应该保留</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="test-content">
      <div class="test-section">
        <h3>纯 JS 实现测试</h3>
        <CommentEditorPure />
      </div>

      <div class="test-section">
        <h3>ProseMirror 实现测试</h3>
        <CommentEditorProseMirror />
      </div>
    </div>

    <div class="test-scenarios">
      <h3>测试场景说明：</h3>

      <div class="scenario">
        <h4>场景 1: 完全重复的文本</h4>
        <div class="scenario-example">
          <p>原文本: "这是测试文本"</p>
          <p>评论1: 选中 "测试文本" → 黄色高亮</p>
          <p>评论2: 选中 "测试文本" → 蓝色高亮（叠加）</p>
          <p>结果: "测试文本" 同时有黄色和蓝色高亮</p>
          <p>删除评论1: 只移除黄色，保留蓝色</p>
        </div>
      </div>

      <div class="scenario">
        <h4>场景 2: 部分重叠的文本</h4>
        <div class="scenario-example">
          <p>原文本: "这是测试文本内容"</p>
          <p>评论1: 选中 "测试文本" → 黄色高亮</p>
          <p>评论2: 选中 "文本内容" → 蓝色高亮</p>
          <p>结果: "文本" 同时有黄色和蓝色高亮</p>
          <p>删除评论1: "测试" 的黄色被移除，"文本" 保留蓝色，"内容" 保留蓝色</p>
        </div>
      </div>

      <div class="scenario">
        <h4>场景 3: 嵌套的文本</h4>
        <div class="scenario-example">
          <p>原文本: "这是一段很长的测试文本"</p>
          <p>评论1: 选中 "一段很长的测试文本" → 黄色高亮</p>
          <p>评论2: 选中 "很长的测试" → 蓝色高亮（嵌套在黄色内）</p>
          <p>结果: "很长的测试" 同时有黄色和蓝色高亮</p>
          <p>删除评论2: 只移除蓝色，"一段很长的测试文本" 保留黄色</p>
        </div>
      </div>

      <div class="scenario">
        <h4>场景 4: 多次重复评论</h4>
        <div class="scenario-example">
          <p>原文本: "测试"</p>
          <p>评论1: 选中 "测试" → 黄色</p>
          <p>评论2: 选中 "测试" → 蓝色</p>
          <p>评论3: 选中 "测试" → 绿色</p>
          <p>评论4: 选中 "测试" → 红色</p>
          <p>删除评论2: 只移除蓝色，保留黄、绿、红</p>
          <p>删除评论1: 只移除黄色，保留绿、红</p>
        </div>
      </div>
    </div>

    <div class="implementation-details">
      <h3>实现原理：</h3>

      <div class="detail-section">
        <h4>纯 JS 实现</h4>
        <pre><code>// 高亮时：为每个评论创建独立的 span 元素
&lt;span data-comment-id="1" style="background: yellow"&gt;
  &lt;span data-comment-id="2" style="background: blue"&gt;
    测试文本
  &lt;/span&gt;
&lt;/span&gt;

// 删除评论2时：
// 1. 查找所有 data-comment-id="2" 的元素
// 2. 将其子节点移到父节点
// 3. 删除该元素
// 4. 结果：只剩下 data-comment-id="1" 的黄色高亮</code></pre>
      </div>

      <div class="detail-section">
        <h4>ProseMirror 实现</h4>
        <pre><code>// 使用 DecorationSet 管理所有高亮
// 每个评论是独立的 Decoration 对象

decorations = [
  Decoration.inline(0, 4, { id: "1", color: "yellow" }),
  Decoration.inline(0, 4, { id: "2", color: "blue" })
]

// 删除评论2时：
set.remove(
  set.find(undefined, undefined,
    spec => spec['data-comment-id'] === "2"
  )
)

// ProseMirror 自动处理重叠的 decoration 渲染</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommentEditorPure from './components/CommentEditorPure.vue'
import CommentEditorProseMirror from './components/CommentEditorProseMirror.vue'
</script>

<style scoped>
.test-wrapper {
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
}

.test-instructions {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 30px;
}

.test-instructions h3 {
  margin-top: 0;
  color: #856404;
}

.test-instructions ol {
  margin: 10px 0 0 20px;
  line-height: 1.8;
}

.test-instructions ul {
  margin: 5px 0 0 20px;
  list-style: none;
}

.test-instructions li {
  margin: 8px 0;
}

.test-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 40px;
}

.test-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.test-section h3 {
  margin-top: 0;
  color: #495057;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.test-scenarios {
  background: #e7f3ff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.test-scenarios h3 {
  margin-top: 0;
  color: #004085;
}

.scenario {
  background: white;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  border: 1px solid #b8daff;
}

.scenario h4 {
  margin-top: 0;
  color: #004085;
}

.scenario-example {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.scenario-example p {
  margin: 5px 0;
}

.implementation-details {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.implementation-details h3 {
  margin-top: 0;
  color: #495057;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  color: #007bff;
  margin-bottom: 10px;
}

.detail-section pre {
  background: #2d2d2d;
  color: #f8f8f2;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0;
}

.detail-section code {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 1200px) {
  .test-content {
    grid-template-columns: 1fr;
  }
}
</style>
