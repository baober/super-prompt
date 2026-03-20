import { useState, useEffect, useCallback } from 'react'
import type { Settings, LlmProvider } from '../types'
import {
  getSettings,
  updateSettings as apiUpdateSettings,
  getLlmProviders,
  addLlmProvider as apiAddProvider,
  updateLlmProvider as apiUpdateProvider,
  deleteLlmProvider as apiDeleteProvider,
} from '../api/client'

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [providers, setProviders] = useState<LlmProvider[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [s, p] = await Promise.all([getSettings(), getLlmProviders()])
        if (!cancelled) {
          setSettings(s)
          setProviders(p)
        }
      } catch (err) {
        console.error('Failed to load settings', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Listen for storage directory changes from other hook instances
  useEffect(() => {
    const handleStorageDirChanged = async () => {
      try {
        const s = await getSettings()
        setSettings(s)
      } catch (err) {
        console.error('Failed to reload settings', err)
      }
    }
    window.addEventListener('storage-dir-changed', handleStorageDirChanged)
    return () => {
      window.removeEventListener('storage-dir-changed', handleStorageDirChanged)
    }
  }, [])

  const updateSettings = useCallback(async (data: Partial<Settings>) => {
    try {
      const updated = await apiUpdateSettings(data)
      setSettings(updated)
      return updated
    } catch (err) {
      console.error('Failed to update settings', err)
      throw err
    }
  }, [])

  const addProvider = useCallback(async (data: Omit<LlmProvider, 'id'>) => {
    try {
      const created = await apiAddProvider(data)
      setProviders((prev) => [...prev, created])
      return created
    } catch (err) {
      console.error('Failed to add provider', err)
      throw err
    }
  }, [])

  const updateProvider = useCallback(async (id: string, data: Partial<LlmProvider>) => {
    try {
      const updated = await apiUpdateProvider(id, data)
      setProviders((prev) => prev.map((p) => (p.id === id ? updated : p)))
      return updated
    } catch (err) {
      console.error('Failed to update provider', err)
      throw err
    }
  }, [])

  const deleteProvider = useCallback(async (id: string) => {
    try {
      await apiDeleteProvider(id)
      setProviders((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error('Failed to delete provider', err)
      throw err
    }
  }, [])

  return {
    settings,
    providers,
    loading,
    updateSettings,
    addProvider,
    updateProvider,
    deleteProvider,
  }
}
