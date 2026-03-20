import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import type { Project } from '../types'

interface ProjectItemProps {
  project: Project
  isActive: boolean
  collapsed: boolean
  isFile?: boolean
  onClick: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export function ProjectItem({
  project,
  isActive,
  collapsed,
  isFile = false,
  onClick,
  onRename,
  onDelete,
}: ProjectItemProps) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const handleRenameConfirm = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== project.name) {
      onRename(project.id, trimmed)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameConfirm()
    } else if (e.key === 'Escape') {
      setEditName(project.name)
      setEditing(false)
    }
  }

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditName(project.name)
    setEditing(true)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(project.id)
  }

  return (
    <div
      className="group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors relative"
      style={{
        backgroundColor: isActive ? 'var(--accent)' : undefined,
        color: isActive ? '#fff' : 'var(--text-primary)',
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? project.name : undefined}
    >
      {/* Icon: 文件图标 or 文件夹图标 */}
      <span className="shrink-0 text-sm" style={{ opacity: 0.7 }}>
        {isFile ? '📄' : '📁'}
      </span>

      {!collapsed && (
        <>
          {editing ? (
            <input
              ref={inputRef}
              className="flex-1 min-w-0 px-1 py-0 rounded text-sm outline-none"
              style={{
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--accent)',
              }}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRenameConfirm}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 min-w-0 truncate text-sm">{project.name}</span>
          )}

          {/* Badge */}
          <span
            className="shrink-0 text-xs px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-primary)',
              color: isActive ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {project.prompt_count}
          </span>

          {/* Action icons */}
          {hovered && !editing && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                className="p-0.5 rounded hover:opacity-80 text-xs"
                style={{ color: isActive ? '#fff' : 'var(--text-secondary)' }}
                onClick={startRename}
                title="Rename"
              >
                ✏️
              </button>
              <button
                className="p-0.5 rounded hover:opacity-80 text-xs"
                style={{ color: isActive ? '#fff' : 'var(--text-secondary)' }}
                onClick={handleDelete}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
