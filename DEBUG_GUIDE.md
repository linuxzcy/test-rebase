# 删除评论高亮功能测试指南

## 问题描述
用户反馈：删除评论时，富文本对应的高亮背景色没有被删除。

## 已添加的调试功能

### 1. 控制台日志
两个组件都已添加详细的控制台日志：

**纯 JS 实现 (CommentEditorPure.vue)**:
- 删除评论时会输出：
  - `删除评论: [commentId]`
  - `找到 X 个匹配的高亮元素`
  - `处理第 X 个元素`
  - `已删除高亮元素`
  - `已规范化 DOM`
  - `删除完成`

**ProseMirror 实现 (CommentEditorProseMirror.vue)**:
- 删除评论时会输出：
  - `删除评论: [commentId]`
  - `发送删除 decoration 的事务`
  - `Plugin: 删除评论高亮 [commentId]`
  - `找到的 decorations: [...]`
  - `已删除 decorations`
  - `删除完成`

### 2. 调试页面
创建了 `DebugComments.vue` 页面，包含：
- 清除本地存储按钮
- 显示调试信息按钮
- 并排显示两个实现，方便对比测试

## 测试步骤

### 步骤 1: 清除旧数据
1. 打开 http://localhost:5174/
2. 点击"清除本地存储"按钮
3. 刷新页面

### 步骤 2: 测试单个评论
1. 在编辑器中选中一段文本（例如"测试文本"）
2. 点击"💬 添加评论"按钮
3. 输入评论内容，点击"提交"
4. 观察文本是否有高亮背景色
5. 点击评论列表中的"删除"按钮
6. **检查点**: 高亮背景色是否被删除？

### 步骤 3: 测试重复评论
1. 选中同一段文本（例如"测试文本"）
2. 添加第一个评论（会显示黄色高亮）
3. 再次选中相同的文本
4. 添加第二个评论（会叠加蓝色高亮）
5. 再次选中相同的文本
6. 添加第三个评论（会叠加绿色高亮）
7. 删除第二个评论
8. **检查点**:
   - 蓝色高亮是否被删除？
   - 黄色和绿色高亮是否保留？
   - 文本内容是否完整？

### 步骤 4: 查看控制台日志
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 执行删除操作
4. 查看控制台输出的日志信息

## 可能的问题原因

### 1. 本地存储数据不一致
- **症状**: 刷新页面后高亮恢复了
- **原因**: 本地存储中保存的内容包含了高亮标记
- **解决**: 点击"清除本地存储"按钮

### 2. DOM 结构被破坏
- **症状**: 删除后文本消失或格式错乱
- **原因**: 高亮元素的嵌套结构有问题
- **解决**: 检查控制台日志，查看 DOM 操作过程

### 3. ProseMirror Decoration 未正确删除
- **症状**: 纯 JS 版本正常，ProseMirror 版本不正常
- **原因**: DecorationSet.remove() 调用有问题
- **解决**: 检查控制台日志中的 "找到的 decorations" 输出

### 4. 选择器匹配失败
- **症状**: 控制台显示"找到 0 个匹配的高亮元素"
- **原因**: data-comment-id 属性不匹配
- **解决**: 检查 HTML 结构，确认属性值是否正确

## 调试技巧

### 1. 检查 HTML 结构
在浏览器开发者工具中：
1. 切换到 Elements 标签
2. 找到编辑器元素
3. 展开查看高亮 span 的结构
4. 确认 `data-comment-id` 属性是否存在

### 2. 手动测试删除逻辑
在浏览器控制台中执行：

```javascript
// 纯 JS 版本
const editor = document.querySelector('.editor')
const highlights = editor.querySelectorAll('[data-comment-id="comment-xxx"]')
console.log('找到的高亮元素:', highlights)

// 手动删除
highlights.forEach(el => {
  const parent = el.parentNode
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el)
  }
  parent.removeChild(el)
})
```

### 3. 检查 ProseMirror 状态
在浏览器控制台中执行：

```javascript
// 获取 ProseMirror 编辑器实例（需要先暴露到 window）
// 在组件中添加: window.editorView = editorView

const decorations = window.editorView.state.plugins
  .find(p => p.spec.key.key === 'comments')
  .getState(window.editorView.state)

console.log('当前的 decorations:', decorations)
```

## 预期结果

### 正常情况
- 删除评论后，对应的高亮背景色立即消失
- 文本内容保持完整，不会丢失
- 其他评论的高亮不受影响
- 控制台没有错误信息

### 异常情况
- 高亮背景色没有消失
- 文本内容丢失或格式错乱
- 控制台有错误信息
- 刷新页面后高亮又出现了

## 下一步

如果问题仍然存在，请提供：
1. 浏览器控制台的完整日志
2. 删除前后的 HTML 结构截图
3. 具体的操作步骤
4. 使用的是哪个实现（纯 JS 还是 ProseMirror）

这将帮助我们更准确地定位和解决问题。
