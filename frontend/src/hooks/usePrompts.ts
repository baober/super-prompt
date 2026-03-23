import { useState, useEffect, useCallback } from 'react'
import type { Prompt } from '../types'
import * as api from '../api/client'

export function usePrompts(activeProjectId: string | null) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPrompts = useCallback(async () => {
    if (!activeProjectId) {
      setPrompts([])
      return
    }
    setLoading(true)
    try {
      const project = await api.getProject(activeProjectId)
      setPrompts(project.prompts.sort((a, b) => a.order - b.order))
    } catch (err) {
      console.error('Failed to fetch prompts:', err)
      setPrompts([])
    } finally {
      setLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  const notifyPromptCountChanged = useCallback(() => {
    window.dispatchEvent(new CustomEvent('prompt-count-changed'))
  }, [])

  const addPrompt = useCallback(async () => {
    if (!activeProjectId) return
    const prompt = await api.addPrompt(activeProjectId, {
      title: '新 Prompt',
      content: '',
      tags: [],
    })
    setPrompts((prev) => [...prev, prompt])
    notifyPromptCountChanged()
    return prompt
  }, [activeProjectId, notifyPromptCountChanged])

  const updatePrompt = useCallback(
    async (promptId: string, data: Partial<Pick<Prompt, 'title' | 'content' | 'tags'>>) => {
      if (!activeProjectId) return
      const updated = await api.updatePrompt(activeProjectId, promptId, data)
      setPrompts((prev) => prev.map((p) => (p.id === promptId ? updated : p)))
      return updated
    },
    [activeProjectId],
  )

  const deletePrompt = useCallback(
    async (promptId: string) => {
      if (!activeProjectId) return
      await api.deletePrompt(activeProjectId, promptId)
      setPrompts((prev) => prev.filter((p) => p.id !== promptId))
      notifyPromptCountChanged()
    },
    [activeProjectId, notifyPromptCountChanged],
  )

  const reorderPrompts = useCallback(
    async (order: string[]) => {
      if (!activeProjectId) return
      // Optimistic update
      setPrompts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]))
        return order.map((id, i) => ({ ...map.get(id)!, order: i }))
      })
      try {
        await api.reorderPrompts(activeProjectId, order)
      } catch (err) {
        console.error('Failed to reorder:', err)
        await fetchPrompts()
      }
    },
    [activeProjectId, fetchPrompts],
  )

  const undoPrompt = useCallback(
    async (promptId: string) => {
      if (!activeProjectId) return
      const restored = await api.undoPrompt(activeProjectId, promptId)
      setPrompts((prev) => prev.map((p) => (p.id === promptId ? restored : p)))
      return restored
    },
    [activeProjectId],
  )

  const replacePrompt = useCallback((updated: Prompt) => {
    setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }, [])

  return {
    prompts,
    loading,
    fetchPrompts,
    addPrompt,
    updatePrompt,
    replacePrompt,
    deletePrompt,
    reorderPrompts,
    undoPrompt,
  }
}
