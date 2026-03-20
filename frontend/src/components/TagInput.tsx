import { useState, useCallback, type KeyboardEvent } from 'react'

const TAG_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316',
]

function tagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('')

  const addTag = useCallback(() => {
    const trimmed = input.trim().replace(/\s/g, '')
    if (!trimmed || trimmed.length > 20 || tags.includes(trimmed)) return
    onChange([...tags, trimmed])
    setInput('')
  }, [input, tags, onChange])

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag))
    },
    [tags, onChange],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        addTag()
      }
      if (e.key === 'Backspace' && input === '' && tags.length > 0) {
        onChange(tags.slice(0, -1))
      }
    },
    [addTag, input, tags, onChange],
  )

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5"
      style={{
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--bg-card)',
      }}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: tagColor(tag) }}
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="cursor-pointer leading-none opacity-70 transition-opacity hover:opacity-100"
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value.replace(/\s/g, '').slice(0, 20))}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? '输入标签后回车添加' : ''}
        className="min-w-[80px] flex-1 border-none bg-transparent py-0.5 text-xs outline-none"
        style={{ color: 'var(--text-primary)' }}
      />
    </div>
  )
}
