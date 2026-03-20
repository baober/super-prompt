export function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl p-4"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-5 w-5 rounded"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            />
            <div className="flex-1 space-y-2">
              <div
                className="h-4 w-1/3 rounded"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              />
              <div
                className="h-3 w-full rounded"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              />
              <div
                className="h-3 w-2/3 rounded"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                className="h-5 w-12 rounded-full"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
