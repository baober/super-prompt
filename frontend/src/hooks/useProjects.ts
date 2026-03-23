import { useState, useCallback, useEffect } from 'react'
import type { Project, Folder } from '../types'
import * as api from '../api/client'

export type SortBy = 'name' | 'modified' | 'created'
export type SortOrder = 'asc' | 'desc'

function sortFieldToApi(by: SortBy): string {
  return by // 'name' | 'modified' | 'created'
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('modified')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async (by?: SortBy, order?: SortOrder, subfolder?: string) => {
    setLoading(true)
    try {
      const data = await api.getProjects(sortFieldToApi(by ?? sortBy), order ?? sortOrder, subfolder)
      setProjects(data.projects)
      setFolders(data.folders)
    } catch (err) {
      console.error('Failed to load projects', err)
    } finally {
      setLoading(false)
    }
  }, [sortBy, sortOrder])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Listen for storage directory changes from SettingsPanel
  useEffect(() => {
    const handleStorageDirChanged = () => {
      fetchProjects()
    }
    window.addEventListener('storage-dir-changed', handleStorageDirChanged)
    return () => {
      window.removeEventListener('storage-dir-changed', handleStorageDirChanged)
    }
  }, [fetchProjects])

  // Listen for prompt count changes (add/delete prompt)
  useEffect(() => {
    const handlePromptCountChanged = () => {
      fetchProjects()
    }
    window.addEventListener('prompt-count-changed', handlePromptCountChanged)
    return () => {
      window.removeEventListener('prompt-count-changed', handlePromptCountChanged)
    }
  }, [fetchProjects])

  const fetchSubfolder = useCallback(async (subfolder: string) => {
    try {
      const data = await api.getProjects(sortFieldToApi(sortBy), sortOrder, subfolder)
      return { projects: data.projects, folders: data.folders }
    } catch (err) {
      console.error('Failed to load subfolder', err)
      return { projects: [], folders: [] }
    }
  }, [sortBy, sortOrder])

  const createProject = useCallback(async (name: string) => {
    const project = await api.createProject(name)
    await fetchProjects()
    setActiveProjectId(project.id)
    return project
  }, [fetchProjects])

  const setActiveProject = useCallback((id: string | null) => {
    setActiveProjectId(id)
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    await api.deleteProject(id)
    if (activeProjectId === id) {
      setActiveProjectId(null)
    }
    await fetchProjects()
  }, [activeProjectId, fetchProjects])

  const renameProject = useCallback(async (id: string, name: string) => {
    const updated = await api.updateProject(id, name)
    if (activeProjectId === id && updated.id !== id) {
      setActiveProjectId(updated.id)
    }
    await fetchProjects()
    return updated
  }, [activeProjectId, fetchProjects])

  const setSort = useCallback((by: SortBy, order: SortOrder) => {
    setSortBy(by)
    setSortOrder(order)
  }, [])

  return {
    projects,
    folders,
    activeProjectId,
    sortBy,
    sortOrder,
    loading,
    fetchProjects,
    fetchSubfolder,
    createProject,
    setActiveProject,
    deleteProject,
    renameProject,
    setSort,
  }
}
