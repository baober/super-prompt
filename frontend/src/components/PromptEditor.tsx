import { useState, useEffect, useCallback } from 'react'
import type { Prompt } from '../types'
import { optimizePrompt, updatePrompt } from '../api/client'
import { TagInput } from './TagInput'
import { AiOptimizeArea } from './AiOptimizeArea'

interface PromptEditorProps {
  prompt: Prompt
  projectId: string
  onClose: () => void
  onUpdated: (prompt: Prompt) => void
  onDelete: (id: string) => void
  onUndo?: (id: string) => Promise<Prompt | undefined>
}

export function PromptEditor({ prompt, projectId, onClose, onUpdated, onDelete, onUndo }: PromptEditorProps) {
  const [title, setTitle] = useState(prompt.title)
  const [content, setContent] = useState(prompt.content)
  const [tags, setTags] = useState<string[]>(prompt.tags)
  const [aiContent, setAiContent] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showAi, setShowAi] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleOptimize = useCallback(async () => {
    setAiLoading(true)
    setAiError(null)
    setShowAi(true)
    try {
      const result = await optimizePrompt(content)
      setAiContent(result.optimized)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('no_llm_enabled')) {
        alert('没有启用的 LLM 服务商，请前往设置页面配置。')
      }
      setAiError(msg)
    } finally {
      setAiLoading(false)
    }
  }, [content])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const finalContent = showAi && aiContent ? aiContent : content
      const updated = await updatePrompt(projectId, prompt.id, {
        title,
        content: finalContent,
        tags,
      })
      onUpdated(updated)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('保存失败: ' + msg)
    } finally {
      setSaving(false)
    }
  }, [projectId, prompt.id, title, content, tags, aiContent, showAi, onUpdated, onClose])

  const handleUndo = useCallback(async () => {
    try {
      if (onUndo) {
        // 通过外部 hook 执行 undo（不会触发额外的 PUT 保存）
        const restored = await onUndo(prompt.id)
        if (restored) {
          setTitle(restored.title)
          setContent(restored.content)
          setTags(restored.tags)
          setAiContent('')
          setShowAi(false)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('撤销失败: ' + msg)
    }
  }, [prompt.id, onUndo])

  // Ctrl+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  return (
    <div
      className="rounded-xl border-2 p-4"
      style={{
        borderColor: 'var(--accent)',
        backgroundColor: 'var(--bg-card)',
      }}
    >
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Prompt 标题"
        className="mb-3 w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none focus:ring-1"
        style={{
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
          backgroundColor: 'transparent',
        }}
      />

      {/* Original content */}
      <label
        className="mb-1 block text-xs font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        📄 原始内容
      </label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        className="mb-3 w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none focus:ring-1"
        style={{
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
          backgroundColor: 'transparent',
        }}
        placeholder="输入 Prompt 内容..."
      />

      {/* 编辑工具栏: AI优化 + 撤销 + 删除 */}
      <div className="mb-3 flex items-center gap-2">
        {!showAi ? (
          <button
            onClick={handleOptimize}
            disabled={aiLoading || !content.trim()}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'var(--success)' }}
          >
            ✨ AI 优化
          </button>
        ) : (
          <button
            onClick={handleOptimize}
            disabled={aiLoading || !content.trim()}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'var(--success)' }}
          >
            🔄 再次优化
          </button>
        )}

        {prompt.has_previous_version && (
          <button
            onClick={handleUndo}
            className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
            }}
          >
            ↩ 撤销
          </button>
        )}

        <button
          onClick={() => onDelete(prompt.id)}
          className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-50"
          style={{
            borderColor: 'var(--border-color)',
            color: '#ef4444',
            backgroundColor: 'transparent',
          }}
        >
          🗑 删除
        </button>
      </div>

      {/* AI optimize area */}
      {showAi && (
        <div className="mb-3">
          <AiOptimizeArea
            content={aiContent}
            onChange={setAiContent}
            loading={aiLoading}
            error={aiError}
          />
        </div>
      )}

      {/* Tags */}
      <label
        className="mb-1 block text-xs font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        🏷️ 标签
      </label>
      <div className="mb-3">
        <TagInput tags={tags} onChange={setTags} />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {saving ? '保存中...' : '保存'}
        </button>
        <button
          onClick={onClose}
          className="cursor-pointer rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors"
          style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
          }}
        >
          取消
        </button>
        <span className="ml-auto text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          Ctrl+S 保存
        </span>
      </div>
    </div>
  )
}
