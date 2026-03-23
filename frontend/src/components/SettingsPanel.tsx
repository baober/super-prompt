import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { useTheme } from '../theme/ThemeProvider'
import { useSettings } from '../hooks/useSettings'
import { browseDirectory } from '../api/client'
import { LlmProviderList } from './LlmProviderList'

interface SettingsPanelProps {
  onClose: () => void
  promptOrder: 'asc' | 'desc'
  onPromptOrderChange: (order: 'asc' | 'desc') => void
}

export function SettingsPanel({ onClose, promptOrder, onPromptOrderChange }: SettingsPanelProps) {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const {
    settings,
    providers,
    loading,
    updateSettings,
    addProvider,
    updateProvider,
    deleteProvider,
  } = useSettings()

  const [storageDir, setStorageDir] = useState('')
  const [optimizePrompt, setOptimizePrompt] = useState('')
  const [storageDirInit, setStorageDirInit] = useState(false)
  const [optimizePromptInit, setOptimizePromptInit] = useState(false)

  // Initialize local state from settings once loaded
  if (settings && !storageDirInit) {
    setStorageDir(settings.storage_dir)
    setStorageDirInit(true)
  }
  if (settings && !optimizePromptInit) {
    setOptimizePrompt(settings.optimize_prompt)
    setOptimizePromptInit(true)
  }

  const [browsing, setBrowsing] = useState(false)

  const handleStorageDirBlur = () => {
    if (settings && storageDir !== settings.storage_dir) {
      updateSettings({ storage_dir: storageDir }).then(() => {
        window.dispatchEvent(new CustomEvent('storage-dir-changed'))
      })
    }
  }

  const handleBrowse = async () => {
    if (browsing) return
    setBrowsing(true)
    try {
      const result = await browseDirectory(storageDir || undefined)
      if (result.path) {
        setStorageDir(result.path)
        await updateSettings({ storage_dir: result.path })
        window.dispatchEvent(new CustomEvent('storage-dir-changed'))
      }
    } catch (err) {
      console.error('Browse directory failed:', err)
    } finally {
      setBrowsing(false)
    }
  }

  const handleOptimizePromptBlur = () => {
    if (settings && optimizePrompt !== settings.optimize_prompt) {
      updateSettings({ optimize_prompt: optimizePrompt })
    }
  }

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
    updateSettings({ language: lang })
  }

  const handleThemeToggle = () => {
    toggleTheme()
    const newTheme = theme === 'light' ? 'dark' : 'light'
    updateSettings({ theme: newTheme })
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
  }

  const sectionTitle = (text: string) => (
    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
      {text}
    </h3>
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            className="w-8 h-8 flex items-center justify-center rounded hover:opacity-80"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
            onClick={onClose}
          >
            ←
          </button>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('settings.title')}
          </h2>
        </div>

        <div className="space-y-8">
          {/* Storage */}
          <section>
            {sectionTitle(t('settings.storageDir'))}
            <div className="flex gap-2">
              <input
                className="flex-1 text-sm px-3 py-2 rounded-lg"
                style={inputStyle}
                value={storageDir}
                onChange={(e) => setStorageDir(e.target.value)}
                onBlur={handleStorageDirBlur}
              />
              <button
                className="text-sm px-4 py-2 rounded-lg hover:opacity-80 whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                onClick={handleBrowse}
                disabled={browsing}
              >
                {browsing ? '...' : t('settings.browse')}
              </button>
            </div>
          </section>

          {/* LLM Providers */}
          <section>
            {sectionTitle(t('settings.llmProviders'))}
            <LlmProviderList
              providers={providers}
              onAdd={addProvider}
              onUpdate={updateProvider}
              onDelete={deleteProvider}
            />
          </section>

          {/* Optimize Prompt */}
          <section>
            {sectionTitle(t('settings.optimizePrompt'))}
            <textarea
              className="w-full text-sm px-3 py-2 rounded-lg resize-y min-h-[120px]"
              style={inputStyle}
              value={optimizePrompt}
              onChange={(e) => setOptimizePrompt(e.target.value)}
              onBlur={handleOptimizePromptBlur}
            />
          </section>

          {/* Service Ports */}
          <section>
            {sectionTitle(t('settings.frontendPort') + ' / ' + t('settings.backendPort'))}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('settings.frontendPort')}:</span>
                <span className="text-sm font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  {settings?.frontend_port ?? '-'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('settings.backendPort')}:</span>
                <span className="text-sm font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  {settings?.backend_port ?? '-'}
                </span>
              </div>
            </div>
          </section>

          {/* Prompt Order */}
          <section>
            {sectionTitle(t('settings.promptOrder'))}
            <div className="flex gap-2">
              <button
                className="text-sm px-4 py-2 rounded-lg hover:opacity-80"
                style={{
                  backgroundColor: promptOrder === 'desc' ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: promptOrder === 'desc' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                onClick={() => onPromptOrderChange('desc')}
              >
                ↓ {t('settings.promptOrderDesc')}
              </button>
              <button
                className="text-sm px-4 py-2 rounded-lg hover:opacity-80"
                style={{
                  backgroundColor: promptOrder === 'asc' ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: promptOrder === 'asc' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                onClick={() => onPromptOrderChange('asc')}
              >
                ↑ {t('settings.promptOrderAsc')}
              </button>
            </div>
          </section>

          {/* Appearance */}
          <section>
            {sectionTitle(t('settings.theme') + ' / ' + t('settings.language'))}
            <div className="flex gap-4 items-center">
              {/* Theme toggle */}
              <button
                className="text-sm px-4 py-2 rounded-lg hover:opacity-80"
                style={{
                  backgroundColor: theme === 'dark' ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: theme === 'dark' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                onClick={handleThemeToggle}
              >
                {theme === 'light' ? '☀ ' + t('settings.themeLight') : '🌙 ' + t('settings.themeDark')}
              </button>

              {/* Language select */}
              <select
                className="text-sm px-3 py-2 rounded-lg"
                style={inputStyle}
                value={i18n.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
