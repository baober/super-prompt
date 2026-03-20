import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Prompt } from '../types'

const TAG_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316',
]

function tagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

interface PromptCardProps {
  prompt: Prompt
  isActive: boolean
  onEdit: (id: string) => void
  onCopy: (content: string) => void
}

export function PromptCard({
  prompt,
  isActive,
  onEdit,
  onCopy,
}: PromptCardProps) {
  const [copied, setCopied] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prompt.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: 'var(--bg-card)',
    borderColor: isActive ? 'var(--accent)' : 'var(--border-color)',
    color: 'var(--text-primary)',
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(prompt.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      onCopy(prompt.content)
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex rounded-xl border-2 transition-shadow hover:shadow-md ${
        isActive ? 'shadow-md' : ''
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex w-8 shrink-0 cursor-grab items-center justify-center rounded-l-xl text-sm opacity-40 transition-opacity hover:opacity-100 active:cursor-grabbing"
        style={{ color: 'var(--text-secondary)' }}
        title="拖拽排序"
      >
        ⠿
      </button>

      {/* Card body */}
      <div
        className="min-w-0 flex-1 cursor-pointer px-3 py-3"
        onClick={() => onEdit(prompt.id)}
      >
        <div className="mb-1 flex items-center gap-2">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-medium"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            {prompt.order + 1}
          </span>
          <h4 className="truncate text-sm font-semibold">{prompt.title}</h4>
        </div>

        {prompt.content && (
          <p
            className="mb-2 line-clamp-3 text-xs leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {prompt.content}
          </p>
        )}

        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {prompt.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: tagColor(tag) }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 固定的复制按钮 */}
      <div className="flex shrink-0 items-center px-2">
        <button
          onClick={handleCopy}
          className="cursor-pointer rounded p-1.5 text-xs transition-colors hover:bg-black/10"
          style={{ color: copied ? 'var(--success)' : 'var(--text-secondary)' }}
          title="复制 Prompt"
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
    </div>
  )
}
