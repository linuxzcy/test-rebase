<template>
  <div class="test-wrapper">
    <h1>ProseMirror 删除测试</h1>

    <div class="info-box">
      <h3>测试说明：</h3>
      <ol>
        <li>点击"添加评论1"按钮，会在"测试文本"上添加黄色高亮</li>
        <li>点击"添加评论2"按钮，会在"测试文本"上添加蓝色高亮（叠加）</li>
        <li>点击"删除评论1"按钮，观察黄色高亮是否被删除</li>
        <li>打开浏览器控制台（F12）查看详细日志</li>
      </ol>
    </div>

    <div class="controls">
      <button @click="addComment1" class="add-btn">添加评论1（黄色）</button>
      <button @click="addComment2" class="add-btn">添加评论2（蓝色）</button>
      <button @click="addComment3" class="add-btn">添加评论3（绿色）</button>
    </div>

    <div class="controls">
      <button @click="deleteComment1" class="delete-btn">删除评论1</button>
      <button @click="deleteComment2" class="delete-btn">删除评论2</button>
      <button @click="deleteComment3" class="delete-btn">删除评论3</button>
    </div>

    <div class="controls">
      <button @click="showAllDecorations" class="info-btn">显示所有 Decorations</button>
      <button @click="clearAll" class="clear-btn">清除所有</button>
    </div>

    <div ref="editorRef" class="editor"></div>

    <div class="comments-list">
      <h3>评论列表</h3>
      <div v-if="comments.length === 0" class="no-comments">暂无评论</div>
      <div v-for="comment in comments" :key="comment.id" class="comment-item">
        <div class="comment-header">
          <strong>{{ comment.id }}</strong>
          <span class="comment-range">[{{ comment.from }}-{{ comment.to }}]</span>
        </div>
        <div class="comment-content">{{ comment.content }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { EditorState, Plugin, PluginKey, Transaction } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'
import { Schema } from 'prosemirror-model'
import { schema as basicSchema } from 'prosemirror-schema-basic'

interface Comment {
  id: string
  from: number
  to: number
  content: string
}

const editorRef = ref<HTMLElement | null>(null)
let editorView: EditorView | null = null

const comments = ref<Comment[]>([])

const commentPluginKey = new PluginKey('comments')

const createCommentPlugin = () => {
  return new Plugin({
    key: commentPluginKey,
    state: {
      init() {
        console.log('=== Plugin 初始化 ===')
        return DecorationSet.empty
      },
      apply(tr: Transaction, set: DecorationSet) {
        console.log('=== Plugin apply 被调用 ===')
        console.log('Transaction:', tr)
        console.log('当前 DecorationSet:', set)

        // 映射现有的 decorations
        set = set.map(tr.mapping, tr.doc)
        console.log('映射后的 DecorationSet:', set)

        const action = tr.getMeta(commentPluginKey)
        console.log('Meta 数据:', action)

        if (action?.type === 'addComment') {
          const { from, to, id, color } = action
          console.log(`添加评论: id=${id}, from=${from}, to=${to}, color=${color}`)

          const spec = {
            class: 'comment-highlight',
            commentId: id,  // 使用 commentId 而不是 data-comment-id
            style: `background-color: ${color}; border-bottom: 2px solid ${color};`
          }
          console.log('Decoration spec:', spec)

          const decoration = Decoration.inline(from, to, spec)
          console.log('创建的 decoration:', decoration)
          console.log('decoration.spec:', decoration.spec)
          console.log('decoration.from:', decoration.from)
          console.log('decoration.to:', decoration.to)

          set = set.add(tr.doc, [decoration])
          console.log('添加后的 DecorationSet:', set)
          console.log('添加后的所有 decorations:', set.find())
        } else if (action?.type === 'removeComment') {
          const { id } = action
          console.log(`删除评论: id=${id}`)
          console.log('删除前的所有 decorations:', set.find())

          // 查找匹配的 decorations
          const allDecorations = set.find()
          console.log('总共有', allDecorations.length, '个 decorations')

          allDecorations.forEach((dec, index) => {
            console.log(`Decoration ${index}:`, dec)
            console.log(`  - spec:`, dec.spec)
            console.log(`  - spec.commentId:`, dec.spec.commentId)
            console.log(`  - from: ${dec.from}, to: ${dec.to}`)
          })

          const toRemove = set.find(undefined, undefined, spec => {
            const matches = spec.commentId === id
            console.log(`检查 spec.commentId=${spec.commentId}, 是否等于 ${id}:`, matches)
            return matches
          })

          console.log('找到的要删除的 decorations:', toRemove)
          console.log('数量:', toRemove.length)

          if (toRemove && toRemove.length > 0) {
            console.log('执行删除操作')
            const oldSet = set
            set = set.remove(toRemove)
            console.log('删除前的 set:', oldSet)
            console.log('删除后的 set:', set)
            console.log('删除后的所有 decorations:', set.find())
          } else {
            console.warn('未找到匹配的 decoration')
          }
        }

        console.log('=== Plugin apply 结束，返回的 DecorationSet ===')
        console.log('最终的 decorations:', set.find())
        return set
      }
    },
    props: {
      decorations(state) {
        return commentPluginKey.getState(state)
      }
    }
  })
}

const addComment1 = () => {
  if (!editorView) return

  const comment: Comment = {
    id: 'comment-1',
    from: 1,
    to: 5,
    content: '第一个评论'
  }

  comments.value.push(comment)

  console.log('>>> 用户操作：添加评论1')
  const tr = editorView.state.tr.setMeta(commentPluginKey, {
    type: 'addComment',
    from: comment.from,
    to: comment.to,
    id: comment.id,
    color: '#fff3cd'
  })
  editorView.dispatch(tr)
  console.log('<<< 添加评论1 完成')
}

const addComment2 = () => {
  if (!editorView) return

  const comment: Comment = {
    id: 'comment-2',
    from: 1,
    to: 5,
    content: '第二个评论'
  }

  comments.value.push(comment)

  console.log('>>> 用户操作：添加评论2')
  const tr = editorView.state.tr.setMeta(commentPluginKey, {
    type: 'addComment',
    from: comment.from,
    to: comment.to,
    id: comment.id,
    color: '#d1ecf1'
  })
  editorView.dispatch(tr)
  console.log('<<< 添加评论2 完成')
}

const addComment3 = () => {
  if (!editorView) return

  const comment: Comment = {
    id: 'comment-3',
    from: 1,
    to: 5,
    content: '第三个评论'
  }

  comments.value.push(comment)

  console.log('>>> 用户操作：添加评论3')
  const tr = editorView.state.tr.setMeta(commentPluginKey, {
    type: 'addComment',
    from: comment.from,
    to: comment.to,
    id: comment.id,
    color: '#d4edda'
  })
  editorView.dispatch(tr)
  console.log('<<< 添加评论3 完成')
}

const deleteComment1 = () => {
  if (!editorView) return

  console.log('>>> 用户操作：删除评论1')
  const index = comments.value.findIndex(c => c.id === 'comment-1')
  if (index !== -1) {
    comments.value.splice(index, 1)
  }

  const tr = editorView.state.tr.setMeta(commentPluginKey, {
    type: 'removeComment',
    id: 'comment-1'
  })
  editorView.dispatch(tr)
  console.log('<<< 删除评论1 完成')
}

const deleteComment2 = () => {
  if (!editorView) return

  console.log('>>> 用户操作：删除评论2')
  const index = comments.value.findIndex(c => c.id === 'comment-2')
  if (index !== -1) {
    comments.value.splice(index, 1)
  }

  const tr = editorView.state.tr.setMeta(commentPluginKey, {
    type: 'removeComment',
    id: 'comment-2'
  })
  editorView.dispatch(tr)
  console.log('<<< 删除评论2 完成')
}

const deleteComment3 = () => {
  if (!editorView) return

  console.log('>>> 用户操作：删除评论3')
  const index = comments.value.findIndex(c => c.id === 'comment-3')
  if (index !== -1) {
    comments.value.splice(index, 1)
  }

  const tr = editorView.state.tr.setMeta(commentPluginKey, {
    type: 'removeComment',
    id: 'comment-3'
  })
  editorView.dispatch(tr)
  console.log('<<< 删除评论3 完成')
}

const showAllDecorations = () => {
  if (!editorView) return

  const decorationSet = commentPluginKey.getState(editorView.state)
  const allDecorations = decorationSet.find()

  console.log('=== 当前所有 Decorations ===')
  console.log('总数:', allDecorations.length)
  allDecorations.forEach((dec, index) => {
    console.log(`Decoration ${index}:`)
    console.log('  - from:', dec.from)
    console.log('  - to:', dec.to)
    console.log('  - spec:', dec.spec)
    console.log('  - data-comment-id:', dec.spec['data-comment-id'])
  })
}

const clearAll = () => {
  if (!editorView) return

  console.log('>>> 清除所有评论')
  comments.value = []

  // 重新创建编辑器状态
  const schema = new Schema({
    nodes: basicSchema.spec.nodes,
    marks: basicSchema.spec.marks
  })

  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, [schema.text('测试文本内容')])
  ])

  const state = EditorState.create({
    doc,
    plugins: [createCommentPlugin()]
  })

  editorView.updateState(state)
  console.log('<<< 清除完成')
}

onMounted(() => {
  if (!editorRef.value) return

  const schema = new Schema({
    nodes: basicSchema.spec.nodes,
    marks: basicSchema.spec.marks
  })

  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, [schema.text('测试文本内容')])
  ])

  const state = EditorState.create({
    doc,
    plugins: [createCommentPlugin()]
  })

  editorView = new EditorView(editorRef.value, {
    state,
    dispatchTransaction(transaction) {
      const newState = editorView!.state.apply(transaction)
      editorView!.updateState(newState)
    }
  })

  console.log('编辑器初始化完成')
  console.log('editorView:', editorView)
})

onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy()
  }
})
</script>

<style scoped>
.test-wrapper {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

.info-box {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.info-box h3 {
  margin-top: 0;
  color: #856404;
}

.info-box ol {
  margin: 10px 0 0 20px;
  line-height: 1.8;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.add-btn {
  background: #28a745;
  color: white;
}

.add-btn:hover {
  background: #218838;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

.info-btn {
  background: #17a2b8;
  color: white;
}

.info-btn:hover {
  background: #138496;
}

.clear-btn {
  background: #6c757d;
  color: white;
}

.clear-btn:hover {
  background: #545b62;
}

.editor {
  border: 2px solid #007bff;
  border-radius: 4px;
  padding: 15px;
  min-height: 150px;
  background: white;
  margin-bottom: 20px;
  font-size: 16px;
  line-height: 1.6;
}

:deep(.ProseMirror) {
  outline: none;
}

:deep(.comment-highlight) {
  padding: 2px 0;
  cursor: pointer;
  transition: all 0.2s;
}

:deep(.comment-highlight:hover) {
  filter: brightness(0.85) !important;
}

.comments-list {
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
}

.comments-list h3 {
  margin-top: 0;
  color: #333;
}

.no-comments {
  color: #999;
  text-align: center;
  padding: 20px;
}

.comment-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 14px;
}

.comment-range {
  color: #666;
  font-family: monospace;
}

.comment-content {
  color: #555;
  font-size: 14px;
}
</style>
