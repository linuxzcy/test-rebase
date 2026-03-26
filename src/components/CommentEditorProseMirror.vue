<template>
  <div class="comment-editor-wrapper">
    <h2>基于 ProseMirror 的评论编辑器</h2>

    <div class="debug-controls">
      <button @click="clearStorage" class="clear-storage-btn">🗑️ 清除本地存储</button>
      <button @click="showDebugInfo" class="debug-info-btn">🔍 显示调试信息</button>
    </div>

    <div class="main-content">
      <div class="editor-container">
        <div ref="editorRef" class="editor"></div>

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
            <button @click="deleteComment(comment.id)" class="delete-btn">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCommentDialog" class="comment-dialog" @click.self="cancelComment">
      <div class="dialog-content">
        <h3>添加评论</h3>
        <div class="selected-text-preview">
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
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { EditorState, Plugin, PluginKey, Transaction } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'
import { Schema } from 'prosemirror-model'
import { schema as basicSchema } from 'prosemirror-schema-basic'

interface Comment {
  id: string
  from: number
  to: number
  content: string
  author: string
  time: string
  selectedText: string
}

const STORAGE_KEY = 'prosemirror-comments'
const CONTENT_KEY = 'prosemirror-content'

const editorRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
let editorView: EditorView | null = null

const comments = ref<Comment[]>([])
const showCommentDialog = ref(false)
const showBubble = ref(false)
const bubbleStyle = ref({})
const newCommentText = ref('')
const selectedText = ref('')
let pendingCommentRange: { from: number; to: number } | null = null

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
  if (!editorView) return
  try {
    const content = editorView.state.doc.toJSON()
    localStorage.setItem(CONTENT_KEY, JSON.stringify(content))
  } catch (e) {
    console.error('保存内容失败:', e)
  }
}

// 创建评论插件
const commentPluginKey = new PluginKey('comments')

// 用于存储 decoration 和 ID 的映射关系
interface DecorationInfo {
  decoration: Decoration
  id: string
  from: number
  to: number
}

const createCommentPlugin = () => {
  return new Plugin({
    key: commentPluginKey,
    state: {
      init() {
        return {
          decorationSet: DecorationSet.empty,
          decorationInfos: [] as DecorationInfo[]
        }
      },
      apply(tr: Transaction, value: { decorationSet: DecorationSet; decorationInfos: DecorationInfo[] }, oldState, newState) {
        console.log('\n🔄 Plugin apply 开始')
        console.log('  - 旧 decorations:', value.decorationInfos.length, '个')

        let { decorationSet, decorationInfos } = value

        // 映射现有的 decorations
        decorationSet = decorationSet.map(tr.mapping, tr.doc)

        // 更新 decorationInfos 中的位置
        decorationInfos = decorationInfos.map(info => ({
          ...info,
          from: tr.mapping.map(info.from),
          to: tr.mapping.map(info.to)
        }))

        console.log('  - 映射后:', decorationInfos.length, '个')

        const action = tr.getMeta(commentPluginKey)
        console.log('  - Meta action:', action)

        if (action?.type === 'addComment') {
          const { from, to, id, color } = action
          console.log('  ➕ 添加评论:', id)

          const decoration = Decoration.inline(from, to, {
            class: 'comment-highlight',
            style: `background-color: ${color}; border-bottom: 2px solid ${color}; filter: brightness(0.9);`
          })

          decorationSet = decorationSet.add(tr.doc, [decoration])

          // 保存 decoration 信息
          decorationInfos.push({
            decoration,
            id,
            from,
            to
          })

          console.log('  - 添加后:', decorationInfos.length, '个 decorations')
        }
        else if (action?.type === 'removeComment') {
          const { id } = action
          console.log('  ➖ 删除评论:', id)
          console.log('  - 删除前:', decorationInfos.length, '个 decorations')

          // 查找要删除的 decoration info
          const infoIndex = decorationInfos.findIndex(info => info.id === id)
          console.log('  - 找到的索引:', infoIndex)

          if (infoIndex !== -1) {
            const info = decorationInfos[infoIndex]
            console.log('  - 要删除的 decoration 位置:', info.from, '-', info.to)

            // 查找该位置的所有 decorations
            const allAtPosition = decorationSet.find(info.from, info.to)
            console.log('  - 该位置共有', allAtPosition.length, '个 decorations')

            // 找到对应的那个 decoration（通过索引匹配）
            if (allAtPosition.length > 0) {
              // 计算这是该位置的第几个 decoration
              const samePositionInfos = decorationInfos.filter(
                i => i.from === info.from && i.to === info.to
              )
              const indexInSamePosition = samePositionInfos.findIndex(i => i.id === id)
              console.log('  - 在相同位置的 decorations 中的索引:', indexInSamePosition)

              if (indexInSamePosition >= 0 && indexInSamePosition < allAtPosition.length) {
                const decorationToRemove = allAtPosition[indexInSamePosition]
                decorationSet = decorationSet.remove([decorationToRemove])
                decorationInfos.splice(infoIndex, 1)
                console.log('  - 删除后:', decorationInfos.length, '个 decorations')
              } else {
                console.warn('  ⚠️ 索引不匹配')
              }
            }
          } else {
            console.warn('  ⚠️ 未找到该评论的 decoration info')
          }
        }
        else if (action?.type === 'restoreComments') {
          const { commentsData } = action
          console.log('  🔄 恢复', commentsData.length, '个评论')

          const newDecorations: Decoration[] = []
          const newInfos: DecorationInfo[] = []

          commentsData.forEach((comment: Comment, index: number) => {
            const color = getColorForComment(index)

            const decoration = Decoration.inline(comment.from, comment.to, {
              class: 'comment-highlight',
              style: `background-color: ${color}; border-bottom: 2px solid ${color}; filter: brightness(0.9);`
            })

            newDecorations.push(decoration)
            newInfos.push({
              decoration,
              id: comment.id,
              from: comment.from,
              to: comment.to
            })
          })

          decorationSet = decorationSet.add(tr.doc, newDecorations)
          decorationInfos = [...decorationInfos, ...newInfos]

          console.log('  - 恢复后:', decorationInfos.length, '个 decorations')
        }

        console.log('  - 最终返回:', decorationInfos.length, '个 decorations')
        console.log('🔄 Plugin apply 结束\n')

        return { decorationSet, decorationInfos }
      }
    },
    props: {
      decorations(state) {
        const value = commentPluginKey.getState(state)
        console.log('📍 props.decorations 被调用, 返回', value?.decorationInfos?.length || 0, '个 decorations')
        return value?.decorationSet
      },
      handleDOMEvents: {
        mouseup(view, event) {
          const { state } = view
          const { from, to } = state.selection

          if (from !== to) {
            const target = event.target as HTMLElement
            if (!target.closest('.comment-dialog') && !target.closest('.comment-bubble')) {
              pendingCommentRange = { from, to }
              selectedText.value = state.doc.textBetween(from, to, ' ')

              // 计算气泡位置
              const coords = view.coordsAtPos(to)
              bubbleStyle.value = {
                position: 'absolute',
                left: `${coords.left}px`,
                top: `${coords.bottom + 5}px`
              }

              showBubble.value = true
            }
          } else {
            showBubble.value = false
          }
          return false
        }
      }
    }
  })
}

const openCommentDialog = () => {
  showBubble.value = false
  showCommentDialog.value = true
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

const submitComment = () => {
  if (!editorView || !pendingCommentRange || !newCommentText.value.trim()) {
    return
  }

  const commentId = `comment-${Date.now()}`
  const color = getColorForComment(comments.value.length)

  const comment: Comment = {
    id: commentId,
    from: pendingCommentRange.from,
    to: pendingCommentRange.to,
    content: newCommentText.value,
    author: '当前用户',
    time: new Date().toLocaleString('zh-CN'),
    selectedText: selectedText.value
  }

  comments.value.push(comment)
  saveComments()

  const tr = editorView.state.tr.setMeta(commentPluginKey, {
    type: 'addComment',
    from: pendingCommentRange.from,
    to: pendingCommentRange.to,
    id: commentId,
    color
  })
  editorView.dispatch(tr)
  saveContent()

  newCommentText.value = ''
  showCommentDialog.value = false
  pendingCommentRange = null
  selectedText.value = ''
}

const cancelComment = () => {
  newCommentText.value = ''
  showCommentDialog.value = false
  showBubble.value = false
  pendingCommentRange = null
  selectedText.value = ''
}

const deleteComment = (commentId: string) => {
  if (!editorView) {
    console.error('editorView 不存在')
    return
  }

  console.log('\n========== 开始删除评论 ==========')
  console.log('要删除的评论 ID:', commentId)

  const commentIndex = comments.value.findIndex(c => c.id === commentId)
  if (commentIndex !== -1) {
    console.log('找到评论，索引:', commentIndex)
    comments.value.splice(commentIndex, 1)
    saveComments()

    // 创建删除事务
    const tr = editorView.state.tr.setMeta(commentPluginKey, {
      type: 'removeComment',
      id: commentId
    })

    // 使用 dispatch
    editorView.dispatch(tr)

    console.log('事务已 dispatch')

    saveContent()
    console.log('========== 删除评论完成 ==========\n')
  } else {
    console.warn('未找到评论:', commentId)
  }
}

const clearStorage = () => {
  if (confirm('确定要清除所有本地存储的评论和内容吗？这将刷新页面。')) {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(CONTENT_KEY)
    location.reload()
  }
}

const showDebugInfo = () => {
  if (!editorView) {
    console.log('editorView 不存在')
    return
  }

  console.log('\n========== 调试信息 ==========')
  console.log('评论列表:', comments.value)
  console.log('editorView:', editorView)
  console.log('editorView.state:', editorView.state)

  const decorationSet = commentPluginKey.getState(editorView.state)
  console.log('当前 DecorationSet:', decorationSet)

  const allDecorations = decorationSet?.find()
  console.log('所有 decorations 数量:', allDecorations?.length)

  allDecorations?.forEach((dec, index) => {
    console.log(`Decoration ${index}:`, {
      from: dec.from,
      to: dec.to,
      spec: dec.spec,
      commentId: dec.spec.commentId
    })
  })

  console.log('========== 调试信息结束 ==========\n')
}

onMounted(() => {
  if (!editorRef.value) return

  loadComments()

  const schema = new Schema({
    nodes: basicSchema.spec.nodes,
    marks: basicSchema.spec.marks
  })

  // 尝试从本地存储加载内容
  let doc
  try {
    const storedContent = localStorage.getItem(CONTENT_KEY)
    if (storedContent) {
      const contentJson = JSON.parse(storedContent)
      doc = schema.nodeFromJSON(contentJson)
    }
  } catch (e) {
    console.error('加载内容失败:', e)
  }

  // 如果没有存储的内容，使用默认内容
  if (!doc) {
    doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.text('这是一个基于 ProseMirror 的评论编辑器示例。选中文本即可添加评论。')
      ]),
      schema.node('paragraph', null, [
        schema.text('ProseMirror 提供了强大的文档模型和插件系统，非常适合构建富文本编辑器。')
      ]),
      schema.node('paragraph', null, [
        schema.text('评论数据会自动保存到本地存储，刷新页面不会丢失。你也可以将数据发送到后端保存。')
      ])
    ])
  }

  const state = EditorState.create({
    doc,
    plugins: [createCommentPlugin()]
  })

  editorView = new EditorView(editorRef.value, {
    state,
    dispatchTransaction(transaction) {
      console.log('⚡ dispatchTransaction 被调用')

      // 应用事务到状态
      const newState = editorView!.state.apply(transaction)

      // 更新视图状态
      editorView!.updateState(newState)

      console.log('✅ updateState 完成')

      // 保存内容变化
      if (transaction.docChanged) {
        saveContent()
      }
    }
  })

  // 恢复评论高亮
  if (comments.value.length > 0) {
    const tr = editorView.state.tr.setMeta(commentPluginKey, {
      type: 'restoreComments',
      commentsData: comments.value
    })
    editorView.dispatch(tr)
  }
})

onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy()
  }
})
</script>

<style scoped>
.comment-editor-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  color: #333;
  margin-bottom: 20px;
}

.debug-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.clear-storage-btn,
.debug-info-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.clear-storage-btn {
  background: #dc3545;
  color: white;
}

.clear-storage-btn:hover {
  background: #c82333;
}

.debug-info-btn {
  background: #17a2b8;
  color: white;
}

.debug-info-btn:hover {
  background: #138496;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 20px;
}

.editor-container {
  position: relative;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.editor {
  padding: 15px;
  min-height: 400px;
  outline: none;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
}

/* ProseMirror 基础样式 - 非常重要！ */
:deep(.ProseMirror) {
  outline: none;
  min-height: 400px;
}

:deep(.ProseMirror p) {
  margin: 0 0 1em 0;
}

:deep(.ProseMirror p:last-child) {
  margin-bottom: 0;
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

.delete-btn {
  padding: 4px 12px;
  font-size: 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s;
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

.selected-text-preview {
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
