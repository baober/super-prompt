import type {
  Project,
  ProjectDetail,
  Prompt,
  Settings,
  LlmProvider,
  SearchResult,
  Folder,
} from '../types'

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API error ${res.status}: ${body}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Projects

export async function getProjects(sort = 'updated', order = 'desc', subfolder?: string): Promise<{ projects: Project[]; folders: Folder[] }> {
  const params = new URLSearchParams({ sort, order })
  if (subfolder) params.set('subfolder', subfolder)
  const data = await request<{ projects: Project[]; folders: Folder[]; current_folder: string | null }>(`/projects?${params}`)
  return { projects: data.projects, folders: data.folders ?? [] }
}

export function createProject(name: string): Promise<Project> {
  return request('/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function getProject(id: string): Promise<ProjectDetail> {
  return request(`/projects/${encodeURIComponent(id)}`)
}

export function updateProject(id: string, name: string): Promise<Project> {
  return request(`/projects/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
}

export function deleteProject(id: string): Promise<void> {
  return request(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// Prompts

export function addPrompt(
  projectId: string,
  data: { title: string; content: string; tags?: string[] },
): Promise<Prompt> {
  return request(`/projects/${encodeURIComponent(projectId)}/prompts`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updatePrompt(
  projectId: string,
  promptId: string,
  data: Partial<Pick<Prompt, 'title' | 'content' | 'tags'>>,
): Promise<Prompt> {
  return request(`/projects/${encodeURIComponent(projectId)}/prompts/${promptId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deletePrompt(projectId: string, promptId: string): Promise<void> {
  return request(`/projects/${encodeURIComponent(projectId)}/prompts/${promptId}`, {
    method: 'DELETE',
  })
}

export function reorderPrompts(projectId: string, order: string[]): Promise<void> {
  return request(`/projects/${encodeURIComponent(projectId)}/prompts/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ order }),
  })
}

export function undoPrompt(projectId: string, promptId: string): Promise<Prompt> {
  return request(`/projects/${encodeURIComponent(projectId)}/prompts/${promptId}/undo`, {
    method: 'POST',
  })
}

// AI

export function optimizePrompt(content: string): Promise<{ optimized: string }> {
  return request('/ai/optimize', {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

// Settings

export function getSettings(): Promise<Settings> {
  return request('/settings')
}

export function updateSettings(data: Partial<Settings>): Promise<Settings> {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function getLlmProviders(): Promise<LlmProvider[]> {
  const data = await request<{ providers: LlmProvider[] }>('/settings/llm-providers')
  return data.providers
}

export function addLlmProvider(
  data: Omit<LlmProvider, 'id'>,
): Promise<LlmProvider> {
  return request('/settings/llm-providers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateLlmProvider(
  id: string,
  data: Partial<LlmProvider>,
): Promise<LlmProvider> {
  return request(`/settings/llm-providers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteLlmProvider(id: string): Promise<void> {
  return request(`/settings/llm-providers/${id}`, { method: 'DELETE' })
}

export function testLlmProvider(id: string): Promise<{ success: boolean; message: string }> {
  return request(`/settings/llm-providers/${id}/test`, { method: 'POST' })
}

export function browseDirectory(initialDir?: string): Promise<{ path: string | null }> {
  return request('/settings/browse-directory', {
    method: 'POST',
    body: JSON.stringify({ initial_dir: initialDir }),
  })
}

// Search

export async function searchPrompts(query: string): Promise<SearchResult[]> {
  const data = await request<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(query)}`)
  return data.results
}
