# Vue3 评论编辑器实现

两种方式实现类似 TinyMCE comment 插件的功能。

## 🎯 功能特性

- ✅ 选中文本添加评论
- ✅ 气泡弹窗确认是否评论
- ✅ 高亮显示评论标记（不同颜色区分）
- ✅ 右侧评论列表管理
- ✅ 定位和删除评论
- ✅ 删除评论时自动移除高亮
- ✅ 重复评论的高亮区互不影响
- ✅ 本地存储（刷新不丢失）
- ✅ 可扩展后端保存
- ✅ Vue3 Composition API (setup 语法)

## 📸 功能演示

### 使用流程
1. 在编辑器中选中文本
2. 文本下方弹出气泡按钮
3. 点击"💬 添加评论"按钮
4. 在对话框中输入评论内容
5. 提交后文本被高亮标记
6. 右侧显示评论列表
7. 可以定位或删除评论
8. 数据自动保存到本地存储

## 🔧 实现方式

### 1. ProseMirror 实现 (`CommentEditorProseMirror.vue`)

基于专业的富文本编辑器框架 ProseMirror。

**优点：**
- 强大的文档模型和插件系统
- 支持协同编辑（可扩展）
- 更好的性能和稳定性
- 丰富的 API 和生态系统

**缺点：**
- 需要学习 ProseMirror 概念
- 包体积较大

**核心实现：**
```typescript
// 使用 ProseMirror 插件系统
const commentPlugin = new Plugin({
  state: {
    init() { return DecorationSet.empty },
    apply(tr, set) {
      // 处理评论的添加和删除
      // 支持恢复评论高亮
      return set.map(tr.mapping, tr.doc)
    }
  },
  props: {
    decorations(state) {
      return commentPluginKey.getState(state)
    },
    handleDOMEvents: {
      mouseup(view, event) {
        // 显示气泡弹窗
      }
    }
  }
})

// 本地存储
localStorage.setItem('prosemirror-comments', JSON.stringify(comments))
localStorage.setItem('prosemirror-content', JSON.stringify(doc))
```

**特点：**
- 每个评论使用不同颜色高亮
- 气泡弹窗交互更友好
- 完整的数据持久化
- 支持内容编辑

### 2. 纯 JS 实现 (`CommentEditorPure.vue`)

使用原生 DOM API 和 Selection API 实现。

**优点：**
- 无需额外依赖
- 轻量级实现
- 完全可控的代码
- 易于理解和定制

**缺点：**
- 需要处理更多边界情况
- 跨浏览器兼容性需要额外处理
- 复杂场景下可能不够稳定

**核心实现：**
```typescript
// 使用原生 Selection API
const selection = window.getSelection()
const range = selection.getRangeAt(0)

// 使用 DOM 操作高亮文本
const span = document.createElement('span')
span.className = 'comment-highlight'
span.style.backgroundColor = color
range.surroundContents(span)

// 本地存储
localStorage.setItem('pure-comments', JSON.stringify(comments))
localStorage.setItem('pure-content', editorRef.innerHTML)
```

**特点：**
- 气泡弹窗交互
- 颜色区分不同评论
- 完整的本地存储
- 支持定位功能

## 使用方法

### 安装依赖

```bash
# 安装 ProseMirror（仅 ProseMirror 实现需要）
pnpm add prosemirror-state prosemirror-view prosemirror-model prosemirror-schema-basic prosemirror-commands
```

### 在项目中使用

```vue
<template>
  <div>
    <!-- ProseMirror 实现 -->
    <CommentEditorProseMirror />

    <!-- 纯 JS 实现 -->
    <CommentEditorPure />
  </div>
</template>

<script setup>
import CommentEditorProseMirror from './components/CommentEditorProseMirror.vue'
import CommentEditorPure from './components/CommentEditorPure.vue'
</script>
```

### 运行演示

```bash
# 启动开发服务器
pnpm dev
```

访问 `CommentDemo.vue` 查看完整演示。

## 操作步骤

1. 在编辑器中选中任意文本
2. 会自动弹出评论对话框
3. 输入评论内容并提交
4. 选中的文本会被高亮标记
5. 在评论列表中可以查看、定位和删除评论

## 技术栈

- Vue 3 (Composition API)
- TypeScript
- ProseMirror (可选)
- 原生 DOM API

## 文件结构

```
src/
├── components/
│   ├── CommentEditorProseMirror.vue  # ProseMirror 实现
│   └── CommentEditorPure.vue         # 纯 JS 实现
└── CommentDemo.vue                   # 演示页面
```

## 扩展功能

### 后端集成

项目包含了完整的后端 API 集成示例（`src/api/commentApi.ts`）：

```typescript
import { saveCommentToBackend, loadCommentsFromBackend } from './api/commentApi'

// 提交评论时同时保存到后端
const submitComment = async () => {
  // 本地保存
  comments.value.push(comment)
  saveComments()

  // 后端保存
  await saveCommentToBackend(comment)
}

// 组件挂载时从后端加载
onMounted(async () => {
  const backendComments = await loadCommentsFromBackend('document-id')
  if (backendComments.length > 0) {
    comments.value = backendComments
  }
})
```

### 重叠评论处理

两种实现都正确处理了重叠评论的情况：

**ProseMirror 实现：**
- 使用 DecorationSet 管理所有高亮
- 每个评论是独立的 decoration
- 删除时只移除对应 ID 的 decoration
- 自动处理重叠区域的渲染

**纯 JS 实现：**
- 使用嵌套的 span 元素
- 删除时检查是否有嵌套的其他高亮
- 只移除当前评论的包装元素
- 保留其他评论的高亮效果

### 可以进一步扩展的功能

- 评论回复
- 评论编辑
- 多用户协作
- 评论权限控制
- 评论导出/导入
- 评论搜索和过滤
- 评论通知
- 评论历史记录

## 选择建议

**选择 ProseMirror 实现：**
- 需要构建复杂的富文本编辑器
- 需要协同编辑功能
- 对稳定性和性能要求高
- 团队有 ProseMirror 经验

**选择纯 JS 实现：**
- 简单的评论功能
- 不想引入额外依赖
- 需要完全自定义控制
- 包体积敏感的项目
