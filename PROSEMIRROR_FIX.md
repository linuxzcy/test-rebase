# ProseMirror 删除高亮问题修复

## 问题原因

在 ProseMirror 中使用 `Decoration.inline()` 时，spec 对象中的属性名如果包含连字符（如 `data-comment-id`），可能会导致在查找时无法正确匹配。

## 解决方案

将属性名从 `data-comment-id` 改为 `commentId`（驼峰命名）。

### 修改前：
```typescript
const decoration = Decoration.inline(from, to, {
  class: 'comment-highlight',
  'data-comment-id': id,  // ❌ 使用连字符
  style: `...`
})

// 查找时
const toRemove = set.find(undefined, undefined, spec => {
  return spec['data-comment-id'] === id  // ❌ 可能无法匹配
})
```

### 修改后：
```typescript
const decoration = Decoration.inline(from, to, {
  class: 'comment-highlight',
  commentId: id,  // ✅ 使用驼峰命名
  style: `...`
})

// 查找时
const toRemove = set.find(undefined, undefined, spec => {
  return spec.commentId === id  // ✅ 可以正确匹配
})
```

## 已修改的文件

1. `src/components/CommentEditorProseMirror.vue`
   - 添加评论时使用 `commentId`
   - 删除评论时查找 `spec.commentId`
   - 恢复评论时使用 `commentId`

2. `src/TestProseMirrorDelete.vue`
   - 测试页面也使用相同的属性名

## 测试步骤

1. 清除浏览器缓存和本地存储
2. 刷新页面
3. 添加评论，观察高亮
4. 删除评论，观察高亮是否消失
5. 查看控制台日志，确认找到了匹配的 decoration

## 控制台日志说明

正常情况下，删除评论时应该看到：

```
Plugin: 删除评论高亮 comment-xxx
当前 DecorationSet 中的所有 decorations: [...]
检查 decoration spec: {...}
spec.commentId: comment-xxx
匹配结果: true
找到的 decorations: [Decoration]
找到的数量: 1
准备删除这些 decorations
删除后的 DecorationSet: [...]
```

如果看到"找到的数量: 0"，说明匹配失败。

## 为什么会出现这个问题？

在 JavaScript 中，对象属性名如果包含特殊字符（如连字符），需要使用引号包裹或方括号访问。虽然我们在代码中正确使用了 `spec['data-comment-id']`，但 ProseMirror 内部可能对 spec 对象进行了某种处理，导致带连字符的属性名无法正确保存或访问。

使用驼峰命名（camelCase）是更安全的做法，这也是 JavaScript 的标准命名约定。

## 注意事项

如果之前已经保存了评论到本地存储，需要清除本地存储，因为旧的评论数据可能包含了错误的 decoration 信息。

清除方法：
1. 打开浏览器开发者工具（F12）
2. 切换到 Application 或 Storage 标签
3. 找到 Local Storage
4. 删除 `prosemirror-comments` 和 `prosemirror-content` 项
5. 刷新页面
