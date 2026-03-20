export interface Project {
  id: string
  name: string
  prompt_count: number
  created: string
  updated: string
}

export interface Folder {
  name: string
  path: string
  project_count: number
  has_subfolders: boolean
}

export interface ProjectDetail extends Project {
  prompts: Prompt[]
}

export interface Prompt {
  id: string
  title: string
  content: string
  tags: string[]
  order: number
  has_previous_version: boolean
}

export interface Settings {
  storage_dir: string
  optimize_prompt: string
  theme: string
  language: string
  frontend_port: number
  backend_port: number
}

export interface LlmProvider {
  id: string
  name: string
  type: string
  base_url: string
  model: string
  enabled: boolean
  api_key?: string
  extra_headers?: Record<string, string>
}

export interface SearchResult {
  project_id: string
  project_name: string
  prompt_id: string
  prompt_title: string
  snippet: string
}
