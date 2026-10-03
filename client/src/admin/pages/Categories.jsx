import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import { createCategory, deleteCategory, listCategories, reorderCategories, updateCategory, useApi } from '../../api/index.js'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { ConfirmDialog, LinkButton, Notice, TextField } from '../ui.jsx'

// The Museum's filter chips, in the order they appear. Renaming is inline:
// edit the name and leave the field (or press Enter) to save. Order is set
// with Up and Down buttons, which work from the keyboard and on touch, unlike
// dragging.

export default function Categories() {
  const { data: categories, error } = useApi(listCategories, [])
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ tone: 'info', text: '' })
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState('')

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
    setAddError('')
    try {
      await createCategory({ name: newName })
      setNewName('')
      setNotice({ tone: 'info', text: 'Added the category at the end.' })
    } catch (err) {
      setAddError(err.message)
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
      <AdminPageHeader title="Categories">Rename and reorder the filter chips on the Museum page.</AdminPageHeader>

      <div className="mb-2">
        <Notice tone={notice.tone}>{notice.text}</Notice>
      </div>

      {error && !categories && <p role="alert" className="text-ink/80">The categories couldn’t load. {error.message} Reload the page to try again.</p>}

      <div className="flex max-w-[40rem] flex-col gap-3">
        {categories && (
          <ol className="divide-y divide-ink/10 rounded-lg border border-ink/10 bg-surface">
            {categories.map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                isFirst={index === 0}
                isLast={index === categories.length - 1}
                onMove={(by) => move(index, by)}
                onDelete={() => setToDelete(category)}
                onSaved={() => setNotice({ tone: 'info', text: 'Saved.' })}
              />
            ))}
          </ol>
        )}

        <form onSubmit={add} className="flex items-end gap-1" noValidate>
          <TextField className="flex-1" label="New category" value={newName} onChange={(event) => { setNewName(event.target.value); setAddError('') }} error={addError} />
          <Button type="submit" disabled={!newName.trim()}>Add category</Button>
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
        <p>The filter chip disappears from the Museum. Only empty categories can be removed.</p>
      </ConfirmDialog>
    </>
  )
}

function CategoryRow({ category, isFirst, isLast, onMove, onDelete, onSaved }) {
  const [name, setName] = useState(category.name)
  const [error, setError] = useState('')
  const inputId = `category-${category.id}`

  async function save() {
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
    <li className="flex flex-col gap-0.5 p-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={inputId} className="sr-only">Name of category {category.name}</label>
        <input
          id={inputId}
          value={name}
          aria-invalid={error ? true : undefined}
          onChange={(event) => { setName(event.target.value); setError('') }}
          onBlur={save}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          className={`min-w-0 flex-1 rounded-sm border bg-surface px-1 py-0.5 hover:border-ink/45 focus-visible:border-primary ${error ? 'border-2 border-accent' : 'border-ink/25'}`}
        />
        <Link to={`/admin/works?category=${category.id}`} className="shrink-0 text-caption text-ink/65 underline-offset-2 hover:underline">
          {category.workCount} {category.workCount === 1 ? 'work' : 'works'}
        </Link>
        <span className="flex shrink-0 gap-1">
          <LinkButton disabled={isFirst} onClick={() => onMove(-1)} aria-label={`Move ${category.name} up`}>Up</LinkButton>
          <LinkButton disabled={isLast} onClick={() => onMove(1)} aria-label={`Move ${category.name} down`}>Down</LinkButton>
          <LinkButton onClick={onDelete} aria-label={`Remove ${category.name}`}>Remove</LinkButton>
        </span>
      </div>
      {error && (
        <p role="alert" className="text-caption font-medium">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </li>
  )
}
