import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ProjectItem } from './ProjectItem'
import { useProjects, type SortBy, type SortOrder } from '../hooks/useProjects'
import { useSettings } from '../hooks/useSettings'
import type { Folder } from '../types'

interface SidebarProps {
  activeProjectId: string | null
  onProjectSelect: (id: string | null) => void
}

const STORAGE_KEY_WIDTH = 'sidebar-width'
const STORAGE_KEY_COLLAPSED = 'sidebar-collapsed'
const MIN_WIDTH = 180
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 260

function SkeletonItem() {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div
        className="w-5 h-5 rounded animate-pulse"
        style={{ backgroundColor: 'var(--border-color)' }}
      />
      <div
        className="flex-1 h-4 rounded animate-pulse"
        style={{ backgroundColor: 'var(--border-color)' }}
      />
    </div>
  )
}

/** 子文件夹项组件 */
function FolderItem({
  folder,
  collapsed,
  activeProjectId,
  onProjectSelect,
  fetchSubfolder,
  onRename,
  onDelete,
}: {
  folder: Folder
  collapsed: boolean
  activeProjectId: string | null
  onProjectSelect: (id: string) => void
  fetchSubfolder: (subfolder: string) => Promise<{ projects: any[]; folders: Folder[] }>
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [subProjects, setSubProjects] = useState<any[]>([])
  const [subFolders, setSubFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (!expanded && subProjects.length === 0 && !loading) {
      setLoading(true)
      const data = await fetchSubfolder(folder.path)
      setSubProjects(data.projects)
      setSubFolders(data.folders)
      setLoading(false)
    }
    setExpanded(!expanded)
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors hover:opacity-80"
        style={{ color: 'var(--text-primary)' }}
        onClick={handleToggle}
        title={collapsed ? folder.name : undefined}
      >
        {/* 文件夹图标 */}
        <span className="shrink-0 text-sm" style={{ opacity: 0.7 }}>
          {expanded ? '📂' : '📁'}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 min-w-0 truncate text-sm font-medium">{folder.name}</span>
            <span
              className="shrink-0 text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
              }}
            >
              {folder.project_count}
            </span>
            <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              {expanded ? '▾' : '▸'}
            </span>
          </>
        )}
      </div>

      {/* 展开后的内容 */}
      {expanded && !collapsed && (
        <div className="pl-3">
          {loading && <SkeletonItem />}
          {subFolders.map((sf) => (
            <FolderItem
              key={sf.path}
              folder={sf}
              collapsed={collapsed}
              activeProjectId={activeProjectId}
              onProjectSelect={onProjectSelect}
              fetchSubfolder={fetchSubfolder}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
          {subProjects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              isActive={activeProjectId === project.id}
              collapsed={collapsed}
              isFile
              onClick={() => onProjectSelect(project.id)}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
          {!loading && subProjects.length === 0 && subFolders.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              空文件夹
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ activeProjectId, onProjectSelect }: SidebarProps) {
  const { t } = useTranslation()
  const { settings } = useSettings()
  const {
    projects,
    folders,
    sortBy,
    sortOrder,
    loading,
    createProject,
    setActiveProject,
    deleteProject,
    renameProject,
    fetchSubfolder,
    setSort,
  } = useProjects()

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_COLLAPSED) === 'true'
  })
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WIDTH)
    return saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parseInt(saved, 10))) : DEFAULT_WIDTH
  })
  const [showSortMenu, setShowSortMenu] = useState(false)
  const resizingRef = useRef(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // 从 storage_dir 中提取目录名
  const dirName = settings?.storage_dir
    ? settings.storage_dir.split('/').filter(Boolean).pop() || settings.storage_dir
    : t('sidebar.title')

  // Sync activeProjectId from parent
  useEffect(() => {
    setActiveProject(activeProjectId)
  }, [activeProjectId, setActiveProject])

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WIDTH, String(width))
  }, [width])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLLAPSED, String(collapsed))
  }, [collapsed])

  // Resize handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizingRef.current = true
    const startX = e.clientX
    const startWidth = width

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + e.clientX - startX))
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      resizingRef.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width])

  const handleCreateProject = async () => {
    const name = window.prompt(t('sidebar.createPrompt'))
    if (!name || !name.trim()) return
    try {
      const project = await createProject(name.trim())
      onProjectSelect(project.id)
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('409')) {
        window.alert(t('sidebar.createDuplicate', { name: name.trim() }))
      } else {
        console.error('Failed to create project', err)
      }
    }
  }

  const handleProjectClick = (id: string) => {
    onProjectSelect(id)
  }

  const handleDelete = async (id: string) => {
    const project = projects.find((p) => p.id === id)
    if (!project) return
    const confirmed = window.confirm(t('sidebar.deleteConfirm', { name: project.name }))
    if (!confirmed) return
    try {
      await deleteProject(id)
      if (activeProjectId === id) {
        onProjectSelect(null)
      }
    } catch (err) {
      console.error('Failed to delete project', err)
    }
  }

  const handleRename = async (id: string, name: string) => {
    try {
      const updated = await renameProject(id, name)
      if (activeProjectId === id && updated) {
        onProjectSelect(name)
      }
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('409')) {
        window.alert(t('sidebar.createDuplicate', { name }))
      } else {
        console.error('Failed to rename project', err)
      }
    }
  }

  const handleSortChange = (by: SortBy, order: SortOrder) => {
    setSort(by, order)
    setShowSortMenu(false)
  }

  const sortLabel = (by: SortBy) => {
    switch (by) {
      case 'name': return t('sidebar.sortByName')
      case 'modified': return t('sidebar.sortByUpdated')
      case 'created': return t('sidebar.sortByCreated')
    }
  }

  const collapsedWidth = 52

  return (
    <div
      ref={sidebarRef}
      className="relative flex flex-col h-full shrink-0 select-none"
      style={{
        width: collapsed ? collapsedWidth : width,
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        transition: resizingRef.current ? 'none' : 'width 0.2s ease',
      }}
    >
      {/* Header: 展示目录名 */}
      <div
        className="flex items-center gap-2 px-3 py-3 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {!collapsed && (
          <h2
            className="flex-1 text-sm font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}
            title={settings?.storage_dir || ''}
          >
            📁 {dirName}
          </h2>
        )}
      </div>

      {/* Sort + New project buttons */}
      {!collapsed && (
        <div
          className="flex items-center gap-1 px-3 py-2 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          {/* Sort dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:opacity-80"
              style={{
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
              }}
              onClick={() => setShowSortMenu(!showSortMenu)}
            >
              <span>⇅</span>
              <span>{sortLabel(sortBy)}</span>
              <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
            </button>
            {showSortMenu && (
              <div
                className="absolute left-0 top-full mt-1 z-50 rounded-md shadow-lg py-1 min-w-[140px]"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {(['name', 'modified', 'created'] as SortBy[]).map((by) =>
                  (['asc', 'desc'] as SortOrder[]).map((order) => (
                    <button
                      key={`${by}-${order}`}
                      className="block w-full text-left px-3 py-1.5 text-xs hover:opacity-80"
                      style={{
                        color: sortBy === by && sortOrder === order ? 'var(--accent)' : 'var(--text-primary)',
                        backgroundColor: sortBy === by && sortOrder === order ? 'var(--bg-primary)' : 'transparent',
                      }}
                      onClick={() => handleSortChange(by, order)}
                    >
                      {sortLabel(by)} {order === 'asc' ? '↑' : '↓'}
                    </button>
                  )),
                )}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* New project button */}
          <button
            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:opacity-80"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
            }}
            onClick={handleCreateProject}
            title={t('sidebar.create')}
          >
            <span>+</span>
            <span>{t('sidebar.create')}</span>
          </button>
        </div>
      )}

      {/* Collapsed: new project icon */}
      {collapsed && (
        <div className="flex flex-col items-center gap-2 py-2">
          <button
            className="w-8 h-8 flex items-center justify-center rounded hover:opacity-80 text-sm"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
            }}
            onClick={handleCreateProject}
            title={t('sidebar.create')}
          >
            +
          </button>
        </div>
      )}

      {/* Project list with folders */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {loading ? (
          <>
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
          </>
        ) : (
          <>
            {/* 子文件夹 */}
            {folders.map((folder) => (
              <FolderItem
                key={folder.path}
                folder={folder}
                collapsed={collapsed}
                activeProjectId={activeProjectId}
                onProjectSelect={handleProjectClick}
                fetchSubfolder={fetchSubfolder}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}

            {/* 根目录下的项目 */}
            {projects.length === 0 && folders.length === 0 ? (
              !collapsed && (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    创建你的第一个项目
                  </p>
                </div>
              )
            ) : (
              projects.map((project) => (
                <ProjectItem
                  key={project.id}
                  project={project}
                  isActive={activeProjectId === project.id}
                  collapsed={collapsed}
                  isFile
                  onClick={() => handleProjectClick(project.id)}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Bottom bar: 只保留展开/折叠按钮 */}
      <div
        className="flex items-center justify-center px-3 py-2 border-t gap-2"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <button
          className="w-8 h-8 flex items-center justify-center rounded hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {collapsed ? '▶' : '◀'}
        </button>
        {!collapsed && (
          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
            {t('sidebar.collapse')}
          </span>
        )}
      </div>

      {/* Resize handle */}
      {!collapsed && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[var(--accent)] transition-colors"
          style={{ opacity: 0.3 }}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Close sort menu on outside click */}
      {showSortMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSortMenu(false)}
        />
      )}
    </div>
  )
}
