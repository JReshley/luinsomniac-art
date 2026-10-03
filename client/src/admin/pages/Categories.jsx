import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createCategory, deleteCategory, listCategories, reorderCategories, updateCategory, useApi } from '../../api/index.js'
import AdminPageHeader from '../AdminPageHeader.jsx'
import {
  borderFor,
  Button,
  ConfirmDialog,
  EmptyState,
  FieldError,
  focusField,
  LinkButton,
  LoadError,
  Notice,
  readDraft,
  rules,
  Skeleton,
  TextField,
  useDraft,
  useValidation,
} from '../ui.jsx'

// The Museum's filter chips, in the order they appear (page pattern:
// Settings). Renaming is in place: edit the name and press Enter or leave the
// field to save; Escape puts the old name back. Order is set with Move up and
// Move down, which work from the keyboard and on touch, unlike dragging.

const DRAFT_KEY = 'new-category'
const checkName = rules.required('Give the category a name.')

export default function Categories() {
  const { data: categories, error } = useApi(listCategories, [])
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ tone: 'info', text: '' })
  const [newName, setNewName] = useState(() => readDraft(DRAFT_KEY)?.value ?? '')
  const validation = useValidation({ name: checkName })
  const nameHeaderId = useId()

  useDraft(DRAFT_KEY, newName, newName.trim() !== '')

  async function move(index, by) {
    const ids = categories.map((category) => category.id)
    ;[ids[index], ids[index + by]] = [ids[index + by], ids[index]]
    try {
      await reorderCategories(ids)
      setNotice({ tone: 'info', text: 'Saved the new order.' })
    } catch (err) {
      setNotice({ tone: 'error', text: err.message })
    }
  }

  async function add(event) {
    event.preventDefault()
    if (validation.checkAll({ name: newName })) return focusField('name')
    try {
      await createCategory({ name: newName })
      setNewName('')
      setNotice({ tone: 'info', text: 'Added the category at the end.' })
    } catch (err) {
      validation.set('name', err.message)
      focusField('name')
    }
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await deleteCategory(toDelete.id)
      setNotice({ tone: 'info', text: `Removed “${toDelete.name}”.` })
    } catch (err) {
      setNotice({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
      setToDelete(null)
    }
  }

  return (
    <>
      <AdminPageHeader title="Categories">The filter chips on the Museum page, in this order. Each work can be in one.</AdminPageHeader>

      <div className="flex max-w-[40rem] flex-col gap-3">
        <Notice tone={notice.tone}>{notice.text}</Notice>

        {!categories && (error ? <LoadError what="categories" error={error} /> : <Skeleton rows={4} />)}

        {categories && (
          <div className="rounded-lg border border-ink/10 bg-surface">
            {categories.length === 0 ? (
              <EmptyState title="No categories yet.">
                Categories become the filter chips on the Museum page. Add the first one below.
              </EmptyState>
            ) : (
              <>
                <div className="flex gap-2 border-b border-ink/10 px-1.5 py-1 text-caption font-medium">
                  <span id={nameHeaderId} className="flex-1">Name</span>
                  <span>Works</span>
                </div>
                <ol className="divide-y divide-ink/10">
                  {categories.map((category, index) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      labelledBy={nameHeaderId}
                      isFirst={index === 0}
                      isLast={index === categories.length - 1}
                      onMove={(by) => move(index, by)}
                      onDelete={() => setToDelete(category)}
                      onSaved={() => setNotice({ tone: 'info', text: 'Saved.' })}
                    />
                  ))}
                </ol>
              </>
            )}
          </div>
        )}

        <form onSubmit={add} className="flex items-start gap-1" noValidate>
          <TextField
            className="flex-1"
            label="New category"
            name="name"
            required
            value={newName}
            onChange={(event) => { setNewName(event.target.value); validation.clear('name') }}
            onBlur={validation.blur('name', newName)}
            error={validation.errors.name}
          />
          {/* Lined up with the input, under the label, so an error below doesn't move it. */}
          <Button type="submit" className="mt-[1.65rem]">Add category</Button>
        </form>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Remove “${toDelete?.name}”?`}
        confirmLabel={`Remove “${toDelete?.name}”`}
        busy={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        <p>The filter chip disappears from the Museum. Only categories with no works can be removed.</p>
      </ConfirmDialog>
    </>
  )
}

function CategoryRow({ category, labelledBy, isFirst, isLast, onMove, onDelete, onSaved }) {
  const [name, setName] = useState(category.name)
  const [error, setError] = useState('')
  const cancelled = useRef(false)
  const countId = `category-${category.id}-count`

  async function save() {
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    const message = checkName(name)
    if (message) return setError(message)
    if (name.trim() === category.name) return
    try {
      await updateCategory(category.id, { name })
      setError('')
      onSaved()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <li className="flex flex-col gap-0.5 p-2">
      <div className="flex flex-wrap items-center gap-x-1.5">
        <input
          value={name}
          aria-labelledby={labelledBy}
          aria-describedby={countId}
          aria-invalid={error ? true : undefined}
          onChange={(event) => { setName(event.target.value); setError('') }}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              cancelled.current = true
              setName(category.name)
              setError('')
              event.currentTarget.blur()
            }
          }}
          className={`min-h-[2.75rem] min-w-[10rem] flex-1 rounded-sm border bg-surface px-1 py-0.5 text-body text-ink hover:border-ink/45 focus-visible:border-primary ${borderFor(error)}`}
        />
        <Link id={countId} to={`/admin/works?category=${category.id}`} className="inline-flex min-h-[2.75rem] shrink-0 items-center text-caption text-primary underline-offset-2 hover:underline">
          {category.workCount} {category.workCount === 1 ? 'work' : 'works'}
        </Link>
        <span className="flex shrink-0 gap-1">
          <LinkButton disabled={isFirst} onClick={() => onMove(-1)} aria-label={`Move ${category.name} up`}>Move up</LinkButton>
          <LinkButton disabled={isLast} onClick={() => onMove(1)} aria-label={`Move ${category.name} down`}>Move down</LinkButton>
          <LinkButton onClick={onDelete} aria-label={`Remove ${category.name}`}>Remove</LinkButton>
        </span>
      </div>
      <FieldError>{error}</FieldError>
    </li>
  )
}
