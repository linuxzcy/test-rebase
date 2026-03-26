<template>
  <div class="pure-comment-editor-wrapper">
    <h2>纯 JS 实现的评论编辑器</h2>
    <div class="main-content">
      <div class="editor-wrapper">
        <div
          ref="editorRef"
          class="editor"
          contenteditable="true"
          @mouseup="handleTextSelection"
          @input="handleInput"
        >
          这是一个纯 JS 实现的评论编辑器示例。选中文本即可添加评论。这个实现不依赖任何富文本编辑器库，完全使用原生 DOM API 和 Selection API 实现。评论数据会自动保存到本地存储，刷新页面不会丢失。
        </div>

        <!-- 气泡弹窗 -->
        <div
          v-if="showBubble"
          class="comment-bubble"
          :style="bubbleStyle"
        >
          <button @click="openCommentDialog" class="bubble-btn">💬 添加评论</button>
        </div>
      </div>

      <div class="comments-panel">
        <h3>评论列表 ({{ comments.length }})</h3>
        <div v-if="comments.length === 0" class="no-comments">暂无评论</div>
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-header">
            <span class="comment-author">{{ comment.author }}</span>
            <span class="comment-time">{{ comment.time }}</span>
          </div>
          <div class="comment-text-preview">
            "{{ comment.selectedText }}"
          </div>
          <div class="comment-content">{{ comment.content }}</div>
          <div class="comment-actions">
            <button @click="highlightComment(comment.id)" class="locate-btn">定位</button>
            <button @click="deleteComment(comment.id)" class="delete-btn">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCommentDialog" class="comment-dialog" @click.self="cancelComment">
      <div class="dialog-content">
        <h3>添加评论</h3>
        <div class="selected-text">
          选中文本: "{{ selectedText }}"
        </div>
        <textarea
          v-model="newCommentText"
          placeholder="输入评论内容..."
          rows="4"
          ref="textareaRef"
        ></textarea>
        <div class="dialog-actions">
          <button @click="submitComment" class="submit-btn">提交</button>
          <button @click="cancelComment" class="cancel-btn">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

interface Comment {
  id: string
  content: string
  author: string
  time: string
  selectedText: string
  color: string
}

const STORAGE_KEY = 'pure-comments'
const CONTENT_KEY = 'pure-content'

const editorRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const comments = ref<Comment[]>([])
const showCommentDialog = ref(false)
const showBubble = ref(false)
const bubbleStyle = ref({})
const newCommentText = ref('')
const selectedText = ref('')

let currentRange: Range | null = null

// 生成随机颜色
const colors = [
  '#fff3cd', '#d1ecf1', '#d4edda', '#f8d7da', '#e2e3e5',
  '#cfe2ff', '#f5c2c7', '#cff4fc', '#d3d3d4', '#ffeaa7'
]

const getColorForComment = (index: number) => {
  return colors[index % colors.length]
}

// 从本地存储加载评论
const loadComments = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      comments.value = JSON.parse(stored)
    }
  } catch (e) {
    console.error('加载评论失败:', e)
  }
}

// 保存评论到本地存储
const saveComments = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments.value))
  } catch (e) {
    console.error('保存评论失败:', e)
  }
}

// 保存编辑器内容
const saveContent = () => {
  if (!editorRef.value) return
  try {
    localStorage.setItem(CONTENT_KEY, editorRef.value.innerHTML)
  } catch (e) {
    console.error('保存内容失败:', e)
  }
}

// 加载编辑器内容
const loadContent = () => {
  if (!editorRef.value) return
  try {
    const stored = localStorage.getItem(CONTENT_KEY)
    if (stored) {
      editorRef.value.innerHTML = stored
    }
  } catch (e) {
    console.error('加载内容失败:', e)
  }
}

// 处理文本选择
const handleTextSelection = (event: MouseEvent) => {
  const selection = window.getSelection()
  if (!selection || !editorRef.value) return

  const text = selection.toString().trim()
  if (text.length === 0) {
    showBubble.value = false
    return
  }

  const range = selection.getRangeAt(0)

  // 确保选择在编辑器内
  if (!editorRef.value.contains(range.commonAncestorContainer)) {
    return
  }

  // 检查是否点击在气泡或对话框上
  const target = event.target as HTMLElement
  if (target.closest('.comment-bubble') || target.closest('.comment-dialog')) {
    return
  }

  selectedText.value = text
  currentRange = range.cloneRange()

  // 计算气泡位置
  const rect = range.getBoundingClientRect()
  bubbleStyle.value = {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.bottom + 5}px`,
    transform: 'translateX(-50%)'
  }

  showBubble.value = true
}

const openCommentDialog = () => {
  showBubble.value = false
  showCommentDialog.value = true
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

// 提交评论
const submitComment = () => {
  if (!currentRange || !newCommentText.value.trim() || !editorRef.value) {
    return
  }

  const commentId = `comment-${Date.now()}`
  const color = getColorForComment(comments.value.length)

  const comment: Comment = {
    id: commentId,
    content: newCommentText.value,
    author: '当前用户',
    time: new Date().toLocaleString('zh-CN'),
    selectedText: selectedText.value,
    color
  }

  comments.value.push(comment)
  saveComments()

  // 高亮选中的文本
  highlightText(comment, currentRange)
  saveContent()

  newCommentText.value = ''
  showCommentDialog.value = false
  currentRange = null
  selectedText.value = ''
}

// 高亮文本 - 改进版，支持重复评论
const highlightText = (comment: Comment, range: Range) => {
  if (!editorRef.value) return

  try {
    // 创建高亮 span
    const span = document.createElement('span')
    span.className = 'comment-highlight'
    span.setAttribute('data-comment-id', comment.id)
    span.setAttribute('title', `评论: ${comment.content}`)
    span.style.backgroundColor = comment.color
    span.style.borderBottom = `2px solid ${comment.color}`
    span.style.filter = 'brightness(0.9)'

    // 尝试直接包裹内容
    try {
      range.surroundContents(span)
    } catch (e) {
      // 如果失败（通常是因为选区跨越了多个节点或已有高亮），使用 extractContents
      const contents = range.extractContents()
      span.appendChild(contents)
      range.insertNode(span)
    }

    // 清除选区
    window.getSelection()?.removeAllRanges()
  } catch (err) {
    console.error('高亮文本失败:', err)
  }
}

// 取消评论
const cancelComment = () => {
  newCommentText.value = ''
  showCommentDialog.value = false
  showBubble.value = false
  currentRange = null
  selectedText.value = ''
}

// 删除评论 - 改进版，精确删除对应的高亮
const deleteComment = (commentId: string) => {
  console.log('删除评论:', commentId)

  const commentIndex = comments.value.findIndex(c => c.id === commentId)
  if (commentIndex !== -1) {
    comments.value.splice(commentIndex, 1)
    saveComments()
  } else {
    console.warn('未找到评论:', commentId)
  }

  // 移除高亮 - 精确删除对应 ID 的所有高亮元素
  if (!editorRef.value) {
    console.error('编辑器引用不存在')
    return
  }

  // 查找所有匹配的高亮元素
  const highlightElements = Array.from(
    editorRef.value.querySelectorAll(`[data-comment-id="${commentId}"]`)
  )

  console.log(`找到 ${highlightElements.length} 个匹配的高亮元素`)

  highlightElements.forEach((highlightElement, index) => {
    console.log(`处理第 ${index + 1} 个元素`)

    const parent = highlightElement.parentNode
    if (!parent) {
      console.warn('没有父节点，跳过')
      return
    }

    // 将高亮元素的所有子节点移到父节点中（保留内容和其他嵌套的高亮）
    const fragment = document.createDocumentFragment()
    while (highlightElement.firstChild) {
      fragment.appendChild(highlightElement.firstChild)
    }

    // 用 fragment 替换高亮元素
    parent.replaceChild(fragment, highlightElement)
    console.log('已删除高亮元素')
  })

  // 合并相邻的文本节点，清理 DOM
  if (editorRef.value) {
    editorRef.value.normalize()
    console.log('已规范化 DOM')
  }

  saveContent()
  console.log('删除完成')
}

// 定位到评论
const highlightComment = (commentId: string) => {
  if (!editorRef.value) return

  const highlightElements = editorRef.value.querySelectorAll(
    `[data-comment-id="${commentId}"]`
  ) as NodeListOf<HTMLElement>

  if (highlightElements.length > 0) {
    const firstElement = highlightElements[0]
    firstElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // 临时高亮效果
    const originalFilter = firstElement.style.filter
    firstElement.style.filter = 'brightness(0.7)'

    setTimeout(() => {
      firstElement.style.filter = originalFilter
    }, 1000)
  }
}

// 处理输入
const handleInput = () => {
  saveContent()
}

onMounted(() => {
  loadComments()
  loadContent()
})
</script>

<style scoped>
.pure-comment-editor-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  color: #333;
  margin-bottom: 20px;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 20px;
}

.editor-wrapper {
  position: relative;
}

.editor {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  min-height: 400px;
  outline: none;
  line-height: 1.6;
  background: white;
  font-size: 16px;
  color: #333;
}

.editor:focus {
  border-color: #007bff;
}

:deep(.comment-highlight) {
  cursor: pointer;
  transition: all 0.2s;
  padding: 2px 0;
}

:deep(.comment-highlight:hover) {
  filter: brightness(0.85) !important;
}

/* 气泡弹窗 */
.comment-bubble {
  position: fixed;
  z-index: 999;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px;
}

.bubble-btn {
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: background 0.2s;
}

.bubble-btn:hover {
  background: #0056b3;
}

.comments-panel {
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  max-height: 600px;
  overflow-y: auto;
}

.comments-panel h3 {
  margin-top: 0;
  color: #333;
  font-size: 18px;
  margin-bottom: 15px;
}

.no-comments {
  color: #999;
  text-align: center;
  padding: 40px 20px;
  font-size: 14px;
}

.comment-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 10px;
  transition: box-shadow 0.2s;
}

.comment-item:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
}

.comment-author {
  font-weight: bold;
  color: #333;
}

.comment-text-preview {
  background: #f0f0f0;
  padding: 6px 10px;
  border-radius: 3px;
  font-size: 13px;
  margin-bottom: 8px;
  color: #555;
  font-style: italic;
  word-break: break-word;
}

.comment-content {
  margin-bottom: 8px;
  line-height: 1.5;
  word-break: break-word;
}

.comment-actions {
  display: flex;
  gap: 8px;
}

.locate-btn,
.delete-btn {
  padding: 4px 12px;
  font-size: 12px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s;
}

.locate-btn {
  background: #28a745;
  color: white;
}

.locate-btn:hover {
  background: #218838;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

.comment-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dialog-content h3 {
  margin-top: 0;
  color: #333;
}

.selected-text {
  background: #e7f3ff;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;
  color: #333;
  border-left: 3px solid #007bff;
  word-break: break-word;
}

.dialog-content textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.dialog-content textarea:focus {
  outline: none;
  border-color: #007bff;
}

.dialog-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  justify-content: flex-end;
}

.submit-btn,
.cancel-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.submit-btn {
  background: #007bff;
  color: white;
}

.submit-btn:hover {
  background: #0056b3;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #545b62;
}

@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .comments-panel {
    max-height: 400px;
  }
}
</style>
