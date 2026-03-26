# 评论编辑器使用指南

## 快速开始

### 1. 基本使用

```vue
<template>
  <div>
    <!-- 使用 ProseMirror 实现 -->
    <CommentEditorProseMirror />

    <!-- 或使用纯 JS 实现 -->
    <CommentEditorPure />
  </div>
</template>

<script setup>
import CommentEditorProseMirror from './components/CommentEditorProseMirror.vue'
import CommentEditorPure from './components/CommentEditorPure.vue'
</script>
```

### 2. 用户操作流程

1. **选中文本**：在编辑器中用鼠标选中任意文本
2. **点击气泡**：文本下方会出现"💬 添加评论"气泡按钮
3. **输入评论**：点击气泡后弹出对话框，输入评论内容
4. **提交评论**：点击"提交"按钮，文本会被高亮标记
5. **查看评论**：右侧评论列表显示所有评论
6. **定位评论**：点击"定位"按钮可以滚动到对应的高亮文本
7. **删除评论**：点击"删除"按钮移除评论和高亮

## 数据持久化

### 本地存储

两种实现都自动使用 localStorage 保存数据：

**ProseMirror 实现：**
- `prosemirror-comments`: 评论列表
- `prosemirror-content`: 编辑器内容（JSON 格式）

**纯 JS 实现：**
- `pure-comments`: 评论列表
- `pure-content`: 编辑器内容（HTML 格式）

### 后端集成

使用提供的 API 工具函数（`src/api/commentApi.ts`）：

```typescript
import {
  saveCommentToBackend,
  loadCommentsFromBackend,
  deleteCommentFromBackend,
  saveDocumentToBackend
} from './api/commentApi'

// 在组件中集成后端保存
const submitComment = async () => {
  // 创建评论对象
  const comment = {
    id: `comment-${Date.now()}`,
    content: newCommentText.value,
    author: '当前用户',
    time: new Date().toLocaleString('zh-CN'),
    selectedText: selectedText.value,
    color: getColorForComment(comments.value.length)
  }

  // 本地保存
  comments.value.push(comment)
  saveComments()

  // 后端保存
  const success = await saveCommentToBackend(comment)
  if (!success) {
    // 处理保存失败的情况
    console.error('保存到后端失败')
  }

  // 添加高亮
  // ...
}

// 组件挂载时加载数据
onMounted(async () => {
  // 优先从后端加载
  const backendComments = await loadCommentsFromBackend('document-id')

  if (backendComments.length > 0) {
    comments.value = backendComments
    // 恢复高亮
    // ...
  } else {
    // 如果后端没有数据，从本地加载
    loadComments()
  }
})

// 删除评论时同步到后端
const deleteComment = async (commentId: string) => {
  // 本地删除
  const commentIndex = comments.value.findIndex(c => c.id === commentId)
  if (commentIndex !== -1) {
    comments.value.splice(commentIndex, 1)
    saveComments()
  }

  // 后端删除
  await deleteCommentFromBackend(commentId)

  // 移除高亮
  // ...
}
```

### 自动保存

可以添加定时自动保存功能：

```typescript
// 每30秒自动保存到后端
let autoSaveTimer: number | null = null

onMounted(() => {
  autoSaveTimer = setInterval(async () => {
    await saveDocumentToBackend('document-id', {
      type: 'prosemirror', // 或 'pure'
      content: editorView.state.doc.toJSON(), // 或 editorRef.value.innerHTML
      comments: comments.value
    })
    console.log('自动保存成功')
  }, 30000)
})

onBeforeUnmount(() => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
  }
})
```

## 重叠评论处理

### 场景说明

当同一段文本被多次评论时，会出现重叠的高亮区域。例如：

```
原文本: "这是一段示例文本"

评论1: 选中 "这是一段" (黄色高亮)
评论2: 选中 "一段示例" (蓝色高亮)

结果: "一段" 会同时有黄色和蓝色高亮
```

### 删除行为

删除评论时，只会移除对应评论的高亮，不影响其他评论：

```
删除评论1后:
- "这是" 的黄色高亮被移除
- "一段" 仍保留蓝色高亮（来自评论2）
- "示例" 仍保留蓝色高亮（来自评论2）
```

### 实现原理

**ProseMirror 实现：**
```typescript
// 使用 DecorationSet 管理所有高亮
// 每个评论是独立的 decoration
set.remove(
  set.find(undefined, undefined, spec => spec['data-comment-id'] === id)
)
// 只移除匹配 ID 的 decoration，其他保持不变
```

**纯 JS 实现：**
```typescript
// 检查是否有嵌套的其他评论高亮
const nestedHighlights = highlightElement.querySelectorAll('.comment-highlight')

if (nestedHighlights.length > 0) {
  // 有嵌套，只移除当前元素，保留内容和嵌套元素
  while (highlightElement.firstChild) {
    parent.insertBefore(highlightElement.firstChild, highlightElement)
  }
  parent.removeChild(highlightElement)
}
```

## 后端 API 设计建议

### 数据模型

```typescript
// 评论表
interface CommentModel {
  id: string
  documentId: string
  content: string
  author: string
  authorId: string
  createdAt: Date
  updatedAt: Date
  selectedText: string
  from?: number  // ProseMirror 位置
  to?: number    // ProseMirror 位置
  color: string
  isDeleted: boolean
}

// 文档表
interface DocumentModel {
  id: string
  title: string
  content: any  // JSON 或 HTML
  editorType: 'prosemirror' | 'pure'
  createdAt: Date
  updatedAt: Date
  authorId: string
}
```

### API 端点

```
POST   /api/comments              创建评论
GET    /api/comments/:documentId  获取文档的所有评论
DELETE /api/comments/:id          删除评论
PUT    /api/comments/:id          更新评论

POST   /api/comments/sync         批量同步评论

GET    /api/documents/:id         获取文档
PUT    /api/documents/:id         更新文档
POST   /api/documents             创建文档
```

### 示例后端实现（Node.js + Express）

```javascript
// routes/comments.js
const express = require('express')
const router = express.Router()

// 创建评论
router.post('/comments', async (req, res) => {
  try {
    const comment = await Comment.create(req.body)
    res.json({ success: true, comment })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取文档的所有评论
router.get('/comments/:documentId', async (req, res) => {
  try {
    const comments = await Comment.find({
      documentId: req.params.documentId,
      isDeleted: false
    })
    res.json({ success: true, comments })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 删除评论（软删除）
router.delete('/comments/:id', async (req, res) => {
  try {
    await Comment.updateOne(
      { _id: req.params.id },
      { isDeleted: true }
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 批量同步评论
router.post('/comments/sync', async (req, res) => {
  try {
    const { comments } = req.body
    // 批量更新或插入
    await Comment.bulkWrite(
      comments.map(comment => ({
        updateOne: {
          filter: { id: comment.id },
          update: comment,
          upsert: true
        }
      }))
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
```

## 常见问题

### Q: 如何自定义评论颜色？

修改 `colors` 数组：

```typescript
const colors = [
  '#fff3cd', // 黄色
  '#d1ecf1', // 蓝色
  '#d4edda', // 绿色
  // 添加更多颜色
]
```

### Q: 如何添加评论回复功能？

扩展 Comment 接口：

```typescript
interface Comment {
  id: string
  content: string
  // ... 其他字段
  replies: Reply[]
}

interface Reply {
  id: string
  commentId: string
  content: string
  author: string
  time: string
}
```

### Q: 如何实现多用户协作？

使用 WebSocket 实时同步：

```typescript
// 连接 WebSocket
const ws = new WebSocket('ws://localhost:3000')

// 监听新评论
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'new-comment') {
    // 添加新评论到列表
    comments.value.push(data.comment)
    // 添加高亮
  }
}

// 发送新评论
const submitComment = () => {
  // ... 创建评论
  ws.send(JSON.stringify({
    type: 'new-comment',
    comment
  }))
}
```

### Q: 如何导出带评论的文档？

```typescript
// 导出为 JSON
const exportDocument = () => {
  const data = {
    content: editorView.state.doc.toJSON(),
    comments: comments.value
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'document-with-comments.json'
  a.click()
}

// 导出为 HTML（带评论标记）
const exportHTML = () => {
  const html = editorRef.value.innerHTML
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'document-with-comments.html'
  a.click()
}
```

## 性能优化建议

1. **虚拟滚动**：评论列表很长时使用虚拟滚动
2. **防抖处理**：自动保存使用防抖避免频繁请求
3. **懒加载**：大文档分页加载评论
4. **索引优化**：后端数据库为 documentId 和 createdAt 建立索引
5. **缓存策略**：使用 Redis 缓存热门文档的评论

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

不支持 IE11。
