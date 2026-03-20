import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearch } from '../hooks/useSearch'

interface SearchBarProps {
  onResultClick: (projectId: string, promptId: string) => void
}

function highlightSnippet(snippet: string, query: string) {
  if (!query.trim()) return snippet

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = snippet.split(regex)

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        style={{
          backgroundColor: 'var(--accent)',
          color: '#fff',
          borderRadius: '2px',
          padding: '0 1px',
        }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

export function SearchBar({ onResultClick }: SearchBarProps) {
  const { t } = useTranslation()
  const { query, setQuery, results, loading, clear } = useSearch()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isOpen = query.trim().length > 0

  const handleClose = useCallback(() => {
    clear()
    inputRef.current?.blur()
  }, [clear])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, handleClose])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  const handleResultClick = (projectId: string, promptId: string) => {
    onResultClick(projectId, promptId)
    handleClose()
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-3xl">
      {/* Input */}
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
        />
        {loading && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs animate-spin"
            style={{ color: 'var(--text-secondary)' }}
          >
            ⏳
          </span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          {!loading && results.length === 0 ? (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('search.noResults')}
            </div>
          ) : (
            results.map((result) => (
              <button
                key={`${result.project_id}-${result.prompt_id}`}
                className="block w-full text-left px-4 py-2.5 hover:opacity-90 transition-colors"
                style={{
                  borderBottom: '1px solid var(--border-color)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                onClick={() => handleResultClick(result.project_id, result.prompt_id)}
              >
                <div className="flex items-center gap-1 text-xs mb-1">
                  <span style={{ color: 'var(--accent)' }}>{result.project_name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>→</span>
                  <span style={{ color: 'var(--text-primary)' }} className="font-medium">
                    {result.prompt_title}
                  </span>
                </div>
                <div
                  className="text-xs truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {highlightSnippet(result.snippet, query)}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
