import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeProvider, useTheme } from './theme/ThemeProvider'
import { Sidebar } from './components/Sidebar'
import { PromptList } from './components/PromptList'
import { SearchBar } from './components/SearchBar'
import { SettingsPanel } from './components/SettingsPanel'
import { usePrompts } from './hooks/usePrompts'

function AppContent() {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [highlightPromptId, setHighlightPromptId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const {
    prompts,
    loading,
    addPrompt,
    replacePrompt,
    deletePrompt,
    reorderPrompts,
    undoPrompt,
  } = usePrompts(activeProjectId)

  const handleAddPrompt = async () => {
    const prompt = await addPrompt()
    if (prompt) setEditingPromptId(prompt.id)
  }

  const handleSearchResultClick = (projectId: string, promptId: string) => {
    setActiveProjectId(projectId)
    setEditingPromptId(null)
    setHighlightPromptId(promptId)
    setTimeout(() => setHighlightPromptId(null), 2000)
  }

  const handleLanguageToggle = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar
        activeProjectId={activeProjectId}
        onProjectSelect={(id) => {
          setActiveProjectId(id)
          setEditingPromptId(null)
        }}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {showSettings ? (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        ) : (
          <>
            {/* 顶部功能区：搜索 + 设置/主题/语言 */}
            <div
              className="flex items-center pl-6 pr-8 py-3 shrink-0 gap-2"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <SearchBar onResultClick={handleSearchResultClick} />

              <div className="flex items-center gap-1 shrink-0 ml-4">
                {/* 设置按钮 */}
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-md hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-secondary)' }}
                  title={t('sidebar.settings')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>

                {/* 主题切换按钮 */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-md hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-secondary)' }}
                  title={theme === 'light' ? t('settings.themeDark') : t('settings.themeLight')}
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>

                {/* 语言切换按钮 */}
                <button
                  onClick={handleLanguageToggle}
                  className="p-2 rounded-md hover:opacity-80 transition-opacity text-xs font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                  title={i18n.language === 'zh' ? 'English' : '中文'}
                >
                  {i18n.language === 'zh' ? 'EN' : '中'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
            {activeProjectId ? (
              <PromptList
                projectId={activeProjectId}
                prompts={prompts}
                loading={loading}
                editingPromptId={editingPromptId}
                highlightPromptId={highlightPromptId}
                onEditPrompt={setEditingPromptId}
                onAddPrompt={handleAddPrompt}
                onDeletePrompt={deletePrompt}
                onReorderPrompts={reorderPrompts}
                onPromptUpdated={replacePrompt}
                onUndoPrompt={undoPrompt}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {t('sidebar.noProjects')}
                </p>
              </div>
            )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
