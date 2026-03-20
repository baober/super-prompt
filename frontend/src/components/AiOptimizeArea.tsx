interface AiOptimizeAreaProps {
  content: string
  onChange: (content: string) => void
  loading: boolean
  error: string | null
}

export function AiOptimizeArea({ content, onChange, loading, error }: AiOptimizeAreaProps) {
  return (
    <div
      className="rounded-lg border-2 p-3"
      style={{
        borderColor: 'var(--success)',
        backgroundColor: 'color-mix(in srgb, var(--success) 5%, transparent)',
      }}
    >
      <div
        className="mb-2 flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: 'var(--success)' }}
      >
        <span>✨ AI 优化版本</span>
        {loading && (
          <span className="ml-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
      </div>

      {error && (
        <div
          className="mb-2 rounded px-2 py-1 text-xs"
          style={{ backgroundColor: 'color-mix(in srgb, red 10%, transparent)', color: '#ef4444' }}
        >
          {error}
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        rows={8}
        className="w-full resize-y rounded-md border bg-white/50 px-3 py-2 text-sm leading-relaxed outline-none focus:ring-1 disabled:opacity-50"
        style={{
          borderColor: 'var(--success)',
          color: 'var(--text-primary)',
        }}
        placeholder={loading ? 'AI 正在优化中...' : 'AI 优化结果将显示在这里'}
      />
    </div>
  )
}
