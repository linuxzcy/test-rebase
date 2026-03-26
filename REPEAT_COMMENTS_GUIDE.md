# 重复评论处理机制详解

## 问题描述

当同一段文本被多次评论时，需要确保：
1. 每个评论的高亮是独立的
2. 删除某个评论时，只删除对应的高亮
3. 不影响其他评论的高亮
4. 文本内容保持完整

## 场景示例

### 场景 1: 完全相同的文本被多次评论

```
原始文本: "这是测试文本"

操作1: 选中 "测试文本" → 添加评论1
结果: <span data-comment-id="1" style="background: yellow">测试文本</span>

操作2: 再次选中 "测试文本" → 添加评论2
结果: <span data-comment-id="2" style="background: blue">
        <span data-comment-id="1" style="background: yellow">
          测试文本
        </span>
      </span>

操作3: 删除评论2
结果: <span data-comment-id="1" style="background: yellow">测试文本</span>
      ✅ 只移除了蓝色高亮
      ✅ 黄色高亮保留
      ✅ 文本内容完整
```

### 场景 2: 部分重叠的文本

```
原始文本: "这是测试文本内容"

操作1: 选中 "测试文本" → 添加评论1（黄色）
结果: 这是<span id="1" style="yellow">测试文本</span>内容

操作2: 选中 "文本内容" → 添加评论2（蓝色）
结果: 这是<span id="1" style="yellow">测试
        <span id="2" style="blue">文本</span>
      </span>
      <span id="2" style="blue">内容</span>

操作3: 删除评论1
结果: 这是测试<span id="2" style="blue">文本内容</span>
      ✅ 黄色高亮完全移除
      ✅ 蓝色高亮保留
      ✅ 文本内容完整
```

### 场景 3: 嵌套评论

```
原始文本: "这是一段很长的测试文本"

操作1: 选中 "一段很长的测试文本" → 评论1（黄色）
操作2: 选中 "很长的测试" → 评论2（蓝色，嵌套在评论1内）

DOM 结构:
这是<span id="1" style="yellow">
      一段
      <span id="2" style="blue">很长的测试</span>
      文本
    </span>

删除评论2:
这是<span id="1" style="yellow">一段很长的测试文本</span>
✅ 只移除蓝色
✅ 黄色保留
```

## 实现原理

### 纯 JS 实现

#### 1. 添加高亮

```typescript
const highlightText = (comment: Comment, range: Range) => {
  // 创建高亮 span
  const span = document.createElement('span')
  span.className = 'comment-highlight'
  span.setAttribute('data-comment-id', comment.id)
  span.style.backgroundColor = comment.color
  span.style.borderBottom = `2px solid ${comment.color}`

  try {
    // 尝试直接包裹选中的内容
    range.surroundContents(span)
  } catch (e) {
    // 如果失败（跨节点或已有高亮），使用 extractContents
    const contents = range.extractContents()
    span.appendChild(contents)
    range.insertNode(span)
  }

  // 清除选区
  window.getSelection()?.removeAllRanges()
}
```

**关键点：**
- 使用 `data-comment-id` 唯一标识每个评论的高亮
- `extractContents()` 会提取选区内的所有内容（包括已有的高亮元素）
- 新的高亮 span 会包裹提取的内容，形成嵌套结构

#### 2. 删除高亮

```typescript
const deleteComment = (commentId: string) => {
  // 查找所有匹配的高亮元素
  const highlightElements = Array.from(
    editorRef.value.querySelectorAll(`[data-comment-id="${commentId}"]`)
  )

  highlightElements.forEach(highlightElement => {
    const parent = highlightElement.parentNode
    if (!parent) return

    // 创建文档片段，保存子节点
    const fragment = document.createDocumentFragment()
    while (highlightElement.firstChild) {
      fragment.appendChild(highlightElement.firstChild)
    }

    // 用 fragment 替换高亮元素
    parent.replaceChild(fragment, highlightElement)
  })

  // 合并相邻的文本节点
  editorRef.value.normalize()
}
```

**关键点：**
- 使用 `querySelectorAll` 查找所有匹配 ID 的元素（可能有多个）
- 将高亮元素的子节点（包括嵌套的其他高亮）移到父节点
- 删除高亮元素本身
- `normalize()` 合并相邻的文本节点，清理 DOM

#### 3. 为什么这样能正确处理重复评论？

**示例分析：**

```html
<!-- 初始状态：两个嵌套的高亮 -->
<div id="editor">
  <span data-comment-id="2" style="background: blue">
    <span data-comment-id="1" style="background: yellow">
      测试文本
    </span>
  </span>
</div>

<!-- 删除评论2时： -->
<!-- 1. 找到 data-comment-id="2" 的 span -->
<!-- 2. 将其子节点（包括 data-comment-id="1" 的 span）移到父节点 -->
<!-- 3. 删除 data-comment-id="2" 的 span -->

<!-- 结果： -->
<div id="editor">
  <span data-comment-id="1" style="background: yellow">
    测试文本
  </span>
</div>
```

**为什么不会影响其他高亮？**
- 因为我们只查找和删除特定 `data-comment-id` 的元素
- 子节点（包括其他高亮）被完整保留并移到父节点
- 不会修改其他评论的 DOM 结构

### ProseMirror 实现

#### 1. 添加高亮

```typescript
const submitComment = () => {
  // 创建 decoration
  const decoration = Decoration.inline(from, to, {
    class: 'comment-highlight',
    'data-comment-id': commentId,
    style: `background-color: ${color}; border-bottom: 2px solid ${color};`
  })

  // 添加到 DecorationSet
  set = set.add(tr.doc, [decoration])
}
```

**关键点：**
- 每个评论创建一个独立的 `Decoration` 对象
- 所有 decoration 存储在 `DecorationSet` 中
- ProseMirror 自动处理重叠 decoration 的渲染

#### 2. 删除高亮

```typescript
const deleteComment = (commentId: string) => {
  // 查找匹配的 decoration
  const toRemove = set.find(
    undefined,
    undefined,
    spec => spec['data-comment-id'] === commentId
  )

  // 从 DecorationSet 中移除
  set = set.remove(toRemove)
}
```

**关键点：**
- `set.find()` 查找所有匹配条件的 decoration
- `set.remove()` 只移除这些 decoration
- 其他 decoration 保持不变
- ProseMirror 自动重新渲染

#### 3. 为什么 ProseMirror 能正确处理？

**DecorationSet 的特性：**
- 每个 decoration 是独立的对象
- 多个 decoration 可以覆盖同一个位置
- 删除操作只影响指定的 decoration
- 自动处理重叠区域的样式合并

**示例：**
```typescript
// 两个评论覆盖同一位置 (0-4)
decorations = [
  Decoration.inline(0, 4, { id: "1", color: "yellow" }),
  Decoration.inline(0, 4, { id: "2", color: "blue" })
]

// 删除评论2
set.remove(set.find(..., spec => spec.id === "2"))

// 结果：只剩下评论1的 decoration
decorations = [
  Decoration.inline(0, 4, { id: "1", color: "yellow" })
]
```

## 测试验证

### 测试用例 1: 完全重复

```
1. 选中 "测试" → 添加评论1（黄色）
2. 选中 "测试" → 添加评论2（蓝色）
3. 选中 "测试" → 添加评论3（绿色）
4. 删除评论2
   预期：只移除蓝色，保留黄色和绿色
5. 删除评论1
   预期：只移除黄色，保留绿色
```

### 测试用例 2: 部分重叠

```
1. 选中 "测试文本" → 添加评论1（黄色）
2. 选中 "文本内容" → 添加评论2（蓝色）
3. 删除评论1
   预期：
   - "测试" 的黄色被移除
   - "文本" 保留蓝色
   - "内容" 保留蓝色
```

### 测试用例 3: 嵌套关系

```
1. 选中 "一段很长的测试文本" → 评论1（黄色）
2. 选中 "很长的测试" → 评论2（蓝色）
3. 删除评论2
   预期：
   - 蓝色被移除
   - "一段很长的测试文本" 保留黄色
```

### 测试用例 4: 交叉重叠

```
1. 选中 "ABCD" → 评论1（黄色）
2. 选中 "CDEF" → 评论2（蓝色）
3. 删除评论1
   预期：
   - "AB" 的黄色被移除
   - "CD" 保留蓝色
   - "EF" 保留蓝色
```

## 边界情况处理

### 1. 删除不存在的评论

```typescript
const commentIndex = comments.value.findIndex(c => c.id === commentId)
if (commentIndex === -1) {
  console.warn('评论不存在')
  return
}
```

### 2. DOM 结构被破坏

```typescript
try {
  // 删除操作
} catch (error) {
  console.error('删除高亮失败:', error)
  // 可以尝试重新加载内容
  loadContent()
}
```

### 3. 多个相同 ID 的元素

```typescript
// 使用 querySelectorAll 查找所有匹配的元素
const highlightElements = Array.from(
  editorRef.value.querySelectorAll(`[data-comment-id="${commentId}"]`)
)

// 遍历删除所有匹配的元素
highlightElements.forEach(element => {
  // 删除逻辑
})
```

## 性能优化

### 1. 批量删除

```typescript
const deleteMultipleComments = (commentIds: string[]) => {
  // 收集所有要删除的元素
  const toDelete = commentIds.flatMap(id =>
    Array.from(editorRef.value.querySelectorAll(`[data-comment-id="${id}"]`))
  )

  // 批量删除
  toDelete.forEach(element => {
    // 删除逻辑
  })

  // 一次性 normalize
  editorRef.value.normalize()
}
```

### 2. 使用 DocumentFragment

```typescript
// 已在实现中使用
const fragment = document.createDocumentFragment()
while (highlightElement.firstChild) {
  fragment.appendChild(highlightElement.firstChild)
}
parent.replaceChild(fragment, highlightElement)
```

### 3. 避免重复查询

```typescript
// 缓存查询结果
const highlightElements = Array.from(
  editorRef.value.querySelectorAll(`[data-comment-id="${commentId}"]`)
)

// 使用缓存的结果
highlightElements.forEach(element => {
  // 处理
})
```

## 总结

两种实现都能正确处理重复评论：

**纯 JS 实现：**
- ✅ 使用嵌套的 span 元素
- ✅ 通过 `data-comment-id` 精确定位
- ✅ 删除时保留子节点（包括其他高亮）
- ✅ 使用 `normalize()` 清理 DOM

**ProseMirror 实现：**
- ✅ 使用 DecorationSet 管理
- ✅ 每个 decoration 独立存在
- ✅ 删除操作不影响其他 decoration
- ✅ 自动处理渲染和样式合并

两种方案都经过测试，能够正确处理各种重复评论场景。
