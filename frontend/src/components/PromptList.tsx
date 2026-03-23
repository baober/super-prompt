import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import type { Prompt } from '../types'
import { PromptCard } from './PromptCard'
import { PromptEditor } from './PromptEditor'
import { Skeleton } from './Skeleton'
import { ConfirmDialog } from './ConfirmDialog'

interface PromptListProps {
  projectId: string
  prompts: Prompt[]
  loading: boolean
  editingPromptId: string | null
  highlightPromptId?: string | null
  reverseOrder?: boolean
  onEditPrompt: (id: string | null) => void
  onAddPrompt: () => void
  onDeletePrompt: (id: string) => void
  onReorderPrompts: (order: string[]) => void
  onPromptUpdated: (prompt: Prompt) => void
  onUndoPrompt: (id: string) => Promise<Prompt | undefined>
}

export function PromptList({
  projectId,
  prompts,
  loading,
  editingPromptId,
  highlightPromptId,
  reverseOrder = false,
  onEditPrompt,
  onAddPrompt,
  onDeletePrompt,
  onReorderPrompts,
  onPromptUpdated,
  onUndoPrompt,
}: PromptListProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = prompts.findIndex((p) => p.id === active.id)
      const newIndex = prompts.findIndex((p) => p.id === over.id)
      const reordered = arrayMove(prompts, oldIndex, newIndex)
      onReorderPrompts(reordered.map((p) => p.id))
    },
    [prompts, onReorderPrompts],
  )

  const handleEdit = useCallback(
    (id: string) => {
      onEditPrompt(editingPromptId === id ? null : id)
    },
    [editingPromptId, onEditPrompt],
  )

  const handleCopy = useCallback((_content: string) => {
    // 复制成功，可以后续添加 toast 提示
  }, [])

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      onDeletePrompt(deleteTarget)
      setDeleteTarget(null)
    }
  }, [deleteTarget, onDeletePrompt])

  // 倒序模式下反转展示列表
  const displayPrompts = reverseOrder ? [...prompts].reverse() : prompts

  if (loading) {
    return (
      <div className="p-4">
        <Skeleton />
      </div>
    )
  }

  return (
    <div className="p-4">
      {prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            添加第一条 Prompt
          </p>
          <button
            onClick={onAddPrompt}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            ＋ 添加新 Prompt
          </button>
        </div>
      ) : (
        <>
          {/* 倒序模式下，添加按钮在列表上方 */}
          {reverseOrder && (
            <button
              onClick={onAddPrompt}
              className="mb-3 w-full cursor-pointer rounded-xl border-2 border-dashed py-3 text-sm font-medium transition-colors hover:border-solid"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
              }}
            >
              ＋ 添加新 Prompt
            </button>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayPrompts.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {displayPrompts.map((prompt) =>
                  editingPromptId === prompt.id ? (
                    <PromptEditor
                      key={prompt.id}
                      prompt={prompt}
                      projectId={projectId}
                      onClose={() => onEditPrompt(null)}
                      onUpdated={onPromptUpdated}
                      onDelete={setDeleteTarget}
                      onUndo={onUndoPrompt}
                    />
                  ) : (
                    <PromptCard
                      key={prompt.id}
                      prompt={prompt}
                      isActive={highlightPromptId === prompt.id}
                      onEdit={handleEdit}
                      onCopy={handleCopy}
                    />
                  ),
                )}
              </div>
            </SortableContext>
          </DndContext>

          {/* 顺序模式下，添加按钮在列表下方 */}
          {!reverseOrder && (
            <button
              onClick={onAddPrompt}
              className="mt-3 w-full cursor-pointer rounded-xl border-2 border-dashed py-3 text-sm font-medium transition-colors hover:border-solid"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
              }}
            >
              ＋ 添加新 Prompt
            </button>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除 Prompt"
        message="确定要删除这条 Prompt 吗？此操作不可撤销。"
        confirmLabel="删除"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
