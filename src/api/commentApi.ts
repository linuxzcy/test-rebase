// API 工具函数 - 用于将评论数据发送到后端

export interface CommentData {
  id: string
  content: string
  author: string
  time: string
  selectedText: string
  from?: number  // ProseMirror 使用
  to?: number    // ProseMirror 使用
  color: string
}

export interface EditorContent {
  type: 'prosemirror' | 'pure'
  content: any  // ProseMirror: JSON, Pure: HTML string
  comments: CommentData[]
}

/**
 * 保存评论到后端
 * @param comment 评论数据
 * @returns Promise<boolean> 是否成功
 */
export async function saveCommentToBackend(comment: CommentData): Promise<boolean> {
  try {
    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(comment)
    })

    if (!response.ok) {
      throw new Error('保存评论失败')
    }

    return true
  } catch (error) {
    console.error('保存评论到后端失败:', error)
    return false
  }
}

/**
 * 从后端加载评论
 * @param documentId 文档ID
 * @returns Promise<CommentData[]> 评论列表
 */
export async function loadCommentsFromBackend(documentId: string): Promise<CommentData[]> {
  try {
    const response = await fetch(`/api/comments/${documentId}`)

    if (!response.ok) {
      throw new Error('加载评论失败')
    }

    const data = await response.json()
    return data.comments || []
  } catch (error) {
    console.error('从后端加载评论失败:', error)
    return []
  }
}

/**
 * 删除后端的评论
 * @param commentId 评论ID
 * @returns Promise<boolean> 是否成功
 */
export async function deleteCommentFromBackend(commentId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('删除评论失败')
    }

    return true
  } catch (error) {
    console.error('从后端删除评论失败:', error)
    return false
  }
}

/**
 * 保存整个文档（包括内容和评论）到后端
 * @param documentId 文档ID
 * @param editorContent 编辑器内容
 * @returns Promise<boolean> 是否成功
 */
export async function saveDocumentToBackend(
  documentId: string,
  editorContent: EditorContent
): Promise<boolean> {
  try {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(editorContent)
    })

    if (!response.ok) {
      throw new Error('保存文档失败')
    }

    return true
  } catch (error) {
    console.error('保存文档到后端失败:', error)
    return false
  }
}

/**
 * 从后端加载整个文档
 * @param documentId 文档ID
 * @returns Promise<EditorContent | null> 文档内容
 */
export async function loadDocumentFromBackend(
  documentId: string
): Promise<EditorContent | null> {
  try {
    const response = await fetch(`/api/documents/${documentId}`)

    if (!response.ok) {
      throw new Error('加载文档失败')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('从后端加载文档失败:', error)
    return null
  }
}

/**
 * 批量同步评论到后端
 * @param comments 评论列表
 * @returns Promise<boolean> 是否成功
 */
export async function syncCommentsToBackend(comments: CommentData[]): Promise<boolean> {
  try {
    const response = await fetch('/api/comments/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comments })
    })

    if (!response.ok) {
      throw new Error('同步评论失败')
    }

    return true
  } catch (error) {
    console.error('同步评论到后端失败:', error)
    return false
  }
}

// 使用示例：
/*
// 在组件中使用

import {
  saveCommentToBackend,
  loadCommentsFromBackend,
  deleteCommentFromBackend,
  saveDocumentToBackend
} from './api/commentApi'

// 提交评论时
const submitComment = async () => {
  // ... 创建评论对象

  // 保存到本地
  comments.value.push(comment)
  saveComments()

  // 同时保存到后端
  await saveCommentToBackend(comment)

  // ... 其他逻辑
}

// 删除评论时
const deleteComment = async (commentId: string) => {
  // ... 本地删除逻辑

  // 同时从后端删除
  await deleteCommentFromBackend(commentId)

  // ... 其他逻辑
}

// 组件挂载时加载数据
onMounted(async () => {
  // 优先从后端加载
  const backendComments = await loadCommentsFromBackend('document-id')
  if (backendComments.length > 0) {
    comments.value = backendComments
  } else {
    // 如果后端没有数据，从本地加载
    loadComments()
  }

  // ... 其他初始化逻辑
})

// 定期自动保存到后端
setInterval(async () => {
  await saveDocumentToBackend('document-id', {
    type: 'prosemirror',
    content: editorView.state.doc.toJSON(),
    comments: comments.value
  })
}, 30000) // 每30秒自动保存一次
*/
