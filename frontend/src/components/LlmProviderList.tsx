import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LlmProvider } from '../types'
import { testLlmProvider } from '../api/client'

interface LlmProviderListProps {
  providers: LlmProvider[]
  onAdd: (data: Omit<LlmProvider, 'id'>) => Promise<LlmProvider>
  onUpdate: (id: string, data: Partial<LlmProvider>) => Promise<LlmProvider>
  onDelete: (id: string) => Promise<void>
}

const EMPTY_FORM: Omit<LlmProvider, 'id'> = {
  name: '',
  type: 'openai_compatible',
  base_url: '',
  model: '',
  enabled: false,
  api_key: '',
  extra_headers: {},
}

/** 可折叠的 key-value 编辑器，用于编辑自定义请求头 */
function ExtraHeadersEditor({
  headers,
  onChange,
  inputStyle,
}: {
  headers: Record<string, string>
  onChange: (headers: Record<string, string>) => void
  inputStyle: React.CSSProperties
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(Object.keys(headers).length > 0)
  const entries = Object.entries(headers)

  const addEntry = () => {
    onChange({ ...headers, '': '' })
  }

  const updateKey = (oldKey: string, newKey: string, index: number) => {
    const newHeaders: Record<string, string> = {}
    entries.forEach(([k, v], i) => {
      newHeaders[i === index ? newKey : k] = v
    })
    onChange(newHeaders)
  }

  const updateValue = (key: string, newValue: string, index: number) => {
    const newHeaders: Record<string, string> = {}
    entries.forEach(([k, v], i) => {
      newHeaders[k] = i === index ? newValue : v
    })
    onChange(newHeaders)
  }

  const removeEntry = (index: number) => {
    const newHeaders: Record<string, string> = {}
    entries.forEach(([k, v], i) => {
      if (i !== index) newHeaders[k] = v
    })
    onChange(newHeaders)
  }

  return (
    <div>
      <button
        type="button"
        className="text-xs flex items-center gap-1 py-1"
        style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ fontSize: 10 }}>{expanded ? '▾' : '▸'}</span>
        {t('settings.providerExtraHeaders')}
        {entries.length > 0 && (
          <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)', fontSize: 10 }}>
            {entries.length}
          </span>
        )}
      </button>
      {expanded && (
        <div className="space-y-1.5 pl-2">
          {entries.map(([key, value], index) => (
            <div key={index} className="flex items-center gap-1.5">
              <input
                className="flex-1 text-xs px-2 py-1 rounded"
                style={inputStyle}
                placeholder="Header-Name"
                value={key}
                onChange={(e) => updateKey(key, e.target.value, index)}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>:</span>
              <input
                className="flex-[2] text-xs px-2 py-1 rounded"
                style={inputStyle}
                placeholder="value"
                value={value}
                onChange={(e) => updateValue(key, e.target.value, index)}
              />
              <button
                type="button"
                className="text-xs px-1.5 py-0.5 rounded hover:opacity-80"
                style={{ color: '#e55', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => removeEntry(index)}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs px-2 py-1 rounded hover:opacity-80"
            style={{ color: 'var(--accent)', background: 'none', border: '1px dashed var(--border-color)', cursor: 'pointer' }}
            onClick={addEntry}
          >
            + {t('settings.providerExtraHeadersAdd')}
          </button>
          <div className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
            {t('settings.providerExtraHeadersHint')}
          </div>
        </div>
      )}
    </div>
  )
}

export function LlmProviderList({ providers, onAdd, onUpdate, onDelete }: LlmProviderListProps) {
  const { t } = useTranslation()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<LlmProvider>>({})
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState<Omit<LlmProvider, 'id'>>(EMPTY_FORM)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({})

  const handleEnable = async (id: string) => {
    // Disable all others, enable this one
    for (const p of providers) {
      if (p.id === id && !p.enabled) {
        await onUpdate(p.id, { enabled: true })
      } else if (p.id !== id && p.enabled) {
        await onUpdate(p.id, { enabled: false })
      }
    }
  }

  const handleEditSave = async () => {
    if (!editingId) return
    // 如果 api_key 为空字符串，说明用户未修改，不发送该字段以避免覆盖真实值
    const { api_key, ...rest } = editForm
    const payload = api_key ? { ...rest, api_key } : rest
    await onUpdate(editingId, payload)
    setEditingId(null)
    setEditForm({})
  }

  const handleAddSave = async () => {
    await onAdd(newForm)
    setAddingNew(false)
    setNewForm(EMPTY_FORM)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('settings.deleteConfirm'))) return
    await onDelete(id)
    if (editingId === id) {
      setEditingId(null)
      setEditForm({})
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    setTestResult((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    try {
      const result = await testLlmProvider(id)
      setTestResult((prev) => ({ ...prev, [id]: result }))
    } catch (err) {
      setTestResult((prev) => ({
        ...prev,
        [id]: { success: false, message: String(err) },
      }))
    } finally {
      setTestingId(null)
    }
  }

  const startEdit = (provider: LlmProvider) => {
    setEditingId(provider.id)
    setEditForm({
      name: provider.name,
      type: provider.type,
      base_url: provider.base_url,
      model: provider.model,
      api_key: '',  // 始终留空，避免显示脱敏值；用户不填则不会更新 api_key
      extra_headers: provider.extra_headers || {},
    })
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
  }

  const renderForm = (
    form: Record<string, unknown>,
    setForm: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void,
    onSave: () => void,
    onCancel: () => void,
  ) => (
    <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>{t('settings.providerName')}</label>
          <input
            className="w-full text-sm px-2 py-1.5 rounded"
            style={inputStyle}
            value={(form.name as string) || ''}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>{t('settings.providerType')}</label>
          <select
            className="w-full text-sm px-2 py-1.5 rounded"
            style={inputStyle}
            value={(form.type as string) || 'openai_compatible'}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
          >
            <option value="openai_compatible">OpenAI Compatible</option>
            <option value="ollama">Ollama</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>{t('settings.providerBaseUrl')}</label>
        <input
          className="w-full text-sm px-2 py-1.5 rounded"
          style={inputStyle}
          placeholder={t('settings.providerBaseUrlPlaceholder')}
          value={(form.base_url as string) || ''}
          onChange={(e) => setForm((p) => ({ ...p, base_url: e.target.value }))}
        />
        <span className="text-xs mt-1 block" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
          {t('settings.providerBaseUrlHint')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>{t('settings.providerModel')}</label>
          <input
            className="w-full text-sm px-2 py-1.5 rounded"
            style={inputStyle}
            value={(form.model as string) || ''}
            onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>{t('settings.providerApiKey')}</label>
          <input
            type="password"
            className="w-full text-sm px-2 py-1.5 rounded"
            style={inputStyle}
            placeholder={t('settings.providerApiKeyPlaceholder')}
            value={(form.api_key as string) || ''}
            onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))}
          />
        </div>
      </div>
      {/* Extra Headers — 可折叠的 key-value 编辑器 */}
      <ExtraHeadersEditor
        headers={(form.extra_headers as Record<string, string>) || {}}
        onChange={(headers) => setForm((p) => ({ ...p, extra_headers: headers }))}
        inputStyle={inputStyle}
      />
      <div className="flex gap-2 pt-1">
        <button
          className="text-xs px-3 py-1.5 rounded"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          onClick={onSave}
        >
          {t('settings.save')}
        </button>
        <button
          className="text-xs px-3 py-1.5 rounded"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          onClick={onCancel}
        >
          {t('settings.cancel')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-2">
      {providers.map((provider) => (
        <div key={provider.id}>
          {editingId === provider.id ? (
            renderForm(
              editForm as Record<string, unknown>,
              setEditForm as (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void,
              handleEditSave,
              () => { setEditingId(null); setEditForm({}) },
            )
          ) : (
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            >
              <input
                type="radio"
                name="enabled-provider"
                checked={provider.enabled}
                onChange={() => handleEnable(provider.id)}
                title={t('settings.providerEnabled')}
                style={{ accentColor: 'var(--accent)' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {provider.name}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  >
                    {provider.type}
                  </span>
                </div>
              <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {provider.model} · {provider.base_url}
                  {provider.api_key && (
                    <span style={{ marginLeft: 8, opacity: 0.6 }}>🔑 {provider.api_key}</span>
                  )}
                  {provider.extra_headers && Object.keys(provider.extra_headers).length > 0 && (
                    <span style={{ marginLeft: 8, opacity: 0.6 }}>📋 {Object.keys(provider.extra_headers).length} headers</span>
                  )}
                </div>
              </div>
              <button
                className="text-xs px-2 py-1 rounded hover:opacity-80"
                style={{
                  color: testingId === provider.id ? 'var(--text-secondary)' : 'var(--accent)',
                  opacity: testingId === provider.id ? 0.6 : 1,
                  cursor: testingId === provider.id ? 'wait' : 'pointer',
                }}
                onClick={() => handleTest(provider.id)}
                disabled={testingId === provider.id}
              >
                {testingId === provider.id ? t('settings.testing') : t('settings.testProvider')}
              </button>
              <button
                className="text-xs px-2 py-1 rounded hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => startEdit(provider)}
              >
                {t('prompt.edit')}
              </button>
              <button
                className="text-xs px-2 py-1 rounded hover:opacity-80"
                style={{ color: '#e55' }}
                onClick={() => handleDelete(provider.id)}
              >
                {t('settings.delete')}
              </button>
            </div>
          )}
          {testResult[provider.id] && (
            <div
              className="text-xs px-3 pb-2 -mt-1"
              style={{ color: testResult[provider.id].success ? '#22c55e' : '#e55' }}
            >
              {testResult[provider.id].success
                ? `✓ ${t('settings.testSuccess')}`
                : `✗ ${t('settings.testFailed')}: ${testResult[provider.id].message}`}
            </div>
          )}
        </div>
      ))}

      {addingNew ? (
        renderForm(
          newForm as unknown as Record<string, unknown>,
          setNewForm as unknown as (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void,
          handleAddSave,
          () => { setAddingNew(false); setNewForm(EMPTY_FORM) },
        )
      ) : (
        <button
          className="w-full text-sm px-3 py-2 rounded-lg border-dashed hover:opacity-80"
          style={{
            border: '2px dashed var(--border-color)',
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
          }}
          onClick={() => setAddingNew(true)}
        >
          + {t('settings.addProvider')}
        </button>
      )}
    </div>
  )
}
