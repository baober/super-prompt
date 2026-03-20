import { useState, useEffect, useRef, useCallback } from 'react'
import { searchPrompts } from '../api/client'
import type { SearchResult } from '../types'

const DEBOUNCE_MS = 300

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)

    timerRef.current = setTimeout(async () => {
      // Cancel previous in-flight request
      if (abortRef.current) {
        abortRef.current.abort()
      }
      abortRef.current = new AbortController()

      try {
        const data = await searchPrompts(query.trim())
        setResults(data)
      } catch {
        // Silently ignore aborted / failed requests
        setResults([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [query])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setLoading(false)
  }, [])

  return { query, setQuery, results, loading, clear }
}
