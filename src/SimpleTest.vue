<template>
  <div class="simple-test">
    <h1>ProseMirror 删除测试 - 最简化版本</h1>

    <div class="alert">
      <strong>重要：</strong>打开浏览器控制台（F12）查看详细日志
    </div>

    <div class="controls">
      <button @click="addComment" class="btn-add">添加评论</button>
      <button @click="deleteComment" class="btn-delete">删除评论</button>
      <button @click="showInfo" class="btn-info">显示信息</button>
    </div>

    <div ref="editorRef" class="editor"></div>

    <div class="info">
      <h3>当前状态：</h3>
      <p>评论数量: {{ commentCount }}</p>
      <p>Decoration 数量: {{ decorationCount }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { EditorState, Plugin, PluginKey } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'
import { Schema } from 'prosemirror-model'
import { schema as basicSchema } from 'prosemirror-schema-basic'

const editorRef = ref<HTMLElement | null>(null)
let editorView: EditorView | null = null

const commentCount = ref(0)
const decorationCount = ref(0)

const commentPluginKey = new PluginKey('comments')

const createCommentPlugin = () => {
  return new Plugin({
    key: commentPluginKey,
    state: {
      init() {
        console.log('✅ Plugin 初始化')
        return DecorationSet.empty
      },
      apply(tr, set) {
        console.log('\n🔄 Plugin apply 开始')
        console.log('  - 输入的 set:', set)
        console.log('  - 输入的 set.find():', set.find())

        // 映射现有的 decorations
        set = set.map(tr.mapping, tr.doc)
        console.log('  - 映射后的 set.find():', set.find())

        const action = tr.getMeta(commentPluginKey)
        console.log('  - Meta action:', action)

        if (action?.type === 'addComment') {
          console.log('  ➕ 添加评论')

          const decoration = Decoration.inline(1, 5, {
            class: 'comment-highlight',
            commentId: 'test-comment',
            style: 'background-color: yellow; border-bottom: 2px solid orange;'
          })

          console.log('  - 创建的 decoration:', decoration)
          console.log('  - decoration.spec:', decoration.spec)
          console.log('  - decoration.spec.commentId:', decoration.spec.commentId)

          set = set.add(tr.doc, [decoration])
          console.log('  - 添加后的 set.find():', set.find())
          console.log('  - 添加后的数量:', set.find().length)
        }
        else if (action?.type === 'removeComment') {
          console.log('  ➖ 删除评论')
          console.log('  - 删除前的数量:', set.find().length)

          // 打印所有 decorations
          const all = set.find()
          all.forEach((dec, i) => {
            console.log(`  - Decoration ${i}:`, {
              from: dec.from,
              to: dec.to,
              spec: dec.spec,
              commentId: dec.spec.commentId
            })
          })

          // 查找要删除的
          const toRemove = set.find(undefined, undefined, spec => {
            const matches = spec.commentId === 'test-comment'
            console.log(`  - 检查 spec.commentId="${spec.commentId}" === "test-comment":`, matches)
            return matches
          })

          console.log('  - 找到的要删除的 decorations:', toRemove)
          console.log('  - 找到的数量:', toRemove.length)

          if (toRemove.length > 0) {
            console.log('  - 执行删除...')
            const oldSet = set
            set = set.remove(toRemove)
            console.log('  - 删除前的 set:', oldSet)
            console.log('  - 删除后的 set:', set)
            console.log('  - 删除后的 set.find():', set.find())
            console.log('  - 删除后的数量:', set.find().length)
          } else {
            console.error('  ❌ 未找到要删除的 decoration!')
          }
        }

        console.log('  - 最终返回的 set.find():', set.find())
        console.log('🔄 Plugin apply 结束\n')

        return set
      }
    },
    props: {
      decorations(state) {
        const set = commentPluginKey.getState(state)
        console.log('📍 decorations() 被调用, 返回:', set)
        return set
      }
    }
  })
}

const addComment = () => {
  if (!editorView) return

  console.log('\n🟢 用户点击：添加评论')

  const tr = editorView.state.tr.setMeta(commentPluginKey, {
    type: 'addComment'
  })

  console.log('  - 创建的 transaction:', tr)
  console.log('  - transaction.getMeta():', tr.getMeta(commentPluginKey))

  editorView.dispatch(tr)

  commentCount.value++
  updateDecorationCount()

  console.log('🟢 添加评论完成\n')
}

const deleteComment = () => {
  if (!editorView) return

  console.log('\n🔴 用户点击：删除评论')

  const tr = editorView.state.tr.setMeta(commentPluginKey, {
    type: 'removeComment'
  })

  console.log('  - 创建的 transaction:', tr)
  console.log('  - transaction.getMeta():', tr.getMeta(commentPluginKey))

  editorView.dispatch(tr)

  commentCount.value--
  updateDecorationCount()

  console.log('🔴 删除评论完成\n')
}

const showInfo = () => {
  if (!editorView) return

  console.log('\n📊 当前状态信息')

  const decorationSet = commentPluginKey.getState(editorView.state)
  console.log('  - DecorationSet:', decorationSet)

  const all = decorationSet.find()
  console.log('  - 所有 decorations:', all)
  console.log('  - 数量:', all.length)

  all.forEach((dec, i) => {
    console.log(`  - Decoration ${i}:`, {
      from: dec.from,
      to: dec.to,
      spec: dec.spec,
      commentId: dec.spec.commentId
    })
  })

  console.log('📊 状态信息结束\n')
}

const updateDecorationCount = () => {
  if (!editorView) return

  const decorationSet = commentPluginKey.getState(editorView.state)
  decorationCount.value = decorationSet.find().length
}

onMounted(() => {
  if (!editorRef.value) return

  console.log('🚀 初始化编辑器')

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
    dispatchTransaction(tr) {
      console.log('⚡ dispatchTransaction 被调用')
      console.log('  - transaction:', tr)
      console.log('  - meta:', tr.getMeta(commentPluginKey))

      const newState = editorView!.state.apply(tr)
      console.log('  - 新的 state:', newState)

      editorView!.updateState(newState)
      console.log('  - updateState 完成')

      updateDecorationCount()
    }
  })

  console.log('🚀 编辑器初始化完成')
  console.log('  - editorView:', editorView)
})
</script>

<style scoped>
.simple-test {
  max-width: 800px;
  margin: 50px auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.alert {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 4px;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: white;
  transition: all 0.2s;
}

.btn-add {
  background: #28a745;
}

.btn-add:hover {
  background: #218838;
}

.btn-delete {
  background: #dc3545;
}

.btn-delete:hover {
  background: #c82333;
}

.btn-info {
  background: #17a2b8;
}

.btn-info:hover {
  background: #138496;
}

.editor {
  border: 2px solid #007bff;
  border-radius: 4px;
  padding: 15px;
  min-height: 100px;
  margin-bottom: 20px;
  font-size: 16px;
  background: white;
}

:deep(.ProseMirror) {
  outline: none;
}

:deep(.comment-highlight) {
  padding: 2px 0;
  cursor: pointer;
}

.info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.info h3 {
  margin-top: 0;
  color: #333;
}

.info p {
  margin: 5px 0;
  font-size: 14px;
}
</style>
