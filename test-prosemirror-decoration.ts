// 测试 ProseMirror DecorationSet.find() 和 remove() 的行为

import { EditorState, Plugin } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'
import { Schema } from 'prosemirror-model'
import { schema as basicSchema } from 'prosemirror-schema-basic'

// 创建一个简单的编辑器
const schema = new Schema({
  nodes: basicSchema.spec.nodes,
  marks: basicSchema.spec.marks
})

const doc = schema.node('doc', null, [
  schema.node('paragraph', null, [schema.text('测试文本内容')])
])

// 创建 decoration set
let decorationSet = DecorationSet.empty

// 添加两个 decoration
const dec1 = Decoration.inline(0, 4, {
  class: 'highlight',
  'data-comment-id': 'comment-1',
  style: 'background: yellow;'
})

const dec2 = Decoration.inline(0, 4, {
  class: 'highlight',
  'data-comment-id': 'comment-2',
  style: 'background: blue;'
})

decorationSet = decorationSet.add(doc, [dec1, dec2])

console.log('初始 decoration set:', decorationSet)
console.log('decoration 数量:', decorationSet.find().length)

// 测试 find 方法
const found = decorationSet.find(undefined, undefined, spec => {
  return spec['data-comment-id'] === 'comment-2'
})

console.log('找到的 decorations:', found)
console.log('found 的类型:', Array.isArray(found))
console.log('found 的长度:', found.length)

// 测试 remove 方法
if (found && found.length > 0) {
  decorationSet = decorationSet.remove(found)
  console.log('删除后的 decoration set:', decorationSet)
  console.log('删除后的 decoration 数量:', decorationSet.find().length)
} else {
  console.error('未找到匹配的 decoration')
}

export {}
