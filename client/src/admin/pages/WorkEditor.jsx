import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import {
  createWork,
  getWork,
  KINDS,
  listActivity,
  listCategories,
  listMedia,
  listWorks,
  publishBlockers,
  STATUSES,
  updateWork,
  useApi,
} from '../../api/index.js'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { MediaField, MediaPicker, MediaThumb } from '../MediaPicker.jsx'
import { Checkbox, ConfirmDialog, KIND_LABELS, LinkButton, Notice, SelectField, StatusBadge, TextArea, TextField } from '../ui.jsx'

// The full-page editor for one work, new or existing. The route decides which:
// /admin/works/new?kind=model starts a blank one, /admin/works/:id loads one.
//
// There is no slug field. A work's address part is made from its title when it's
// first saved and never changes after, so renaming a work can't break a link to
// it. (The data layer makes it when the form sends none.)
//
// The form keeps its own copy of the work as plain strings (a tag list is one
// comma-separated field, a year is text) and turns it into what the API wants
// on save. Fields the API rejects come back with a `field` name, which is
// shown under the matching input.

export default function WorkEditor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const kind = params.get('kind')

  if (!id && !KINDS.includes(kind)) return <ChooseKind />
  return id ? <EditExisting id={id} /> : <WorkForm key={kind} kind={kind} />
}

function ChooseKind() {
  return (
    <>
      <AdminPageHeader title="New work">What are you adding?</AdminPageHeader>
      <div className="flex flex-wrap gap-1">
        {KINDS.map((kind) => (
          <Button key={kind} href={`/admin/works/new?kind=${kind}`} variant="outline" viewTransition={false}>
            {KIND_LABELS[kind]}
          </Button>
        ))}
      </div>
    </>
  )
}

function EditExisting({ id }) {
  const { data: work, error } = useApi(() => getWork(id), [id])
  const [loaded, setLoaded] = useState(null)

  // Take the first copy that arrives and leave it alone: later reloads (from
  // this form's own saves) must not overwrite what's being typed.
  useEffect(() => {
    if (work && loaded?.id !== work.id) setLoaded(work)
  }, [work, loaded])

  if (error?.code === 'not_found') {
    return (
      <>
        <AdminPageHeader title="Work not found">{error.message}</AdminPageHeader>
        <Button href="/admin/works" variant="outline" viewTransition={false}>Back to works</Button>
      </>
    )
  }
  if (!loaded) {
    return error ? (
      <p role="alert" className="text-ink/80">The work couldn’t load. {error.message} Reload the page to try again.</p>
    ) : (
      <AdminPageHeader title="Loading…" />
    )
  }
  return <WorkForm key={loaded.id} kind={loaded.kind} work={loaded} />
}

// --- The form ---------------------------------------------------------------

const list = (text) => text.split(',').map((item) => item.trim()).filter(Boolean)

function toForm(kind, work) {
  return {
    title: work?.title ?? '',
    year: work?.year == null ? '' : String(work.year),
    categoryId: work?.categoryId ?? '',
    description: work?.description ?? '',
    tags: (work?.tags ?? []).join(', '),
    featured: work?.featured ?? false,
    status: work?.status ?? 'draft',
    isOwnWork: work?.isOwnWork ?? true,
    showsRealFace: work?.showsRealFace ?? false,
    faceConsent: work?.faceConsent ?? false,
    notesArtist: work?.notesArtist ?? '',
    notesAdmin: work?.notesAdmin ?? '',
    coverMediaId: work?.coverMediaId ?? null,
    gallery: (work?.gallery ?? []).map((media) => ({ mediaId: media.id, caption: media.caption ?? '' })),
    model: {
      software: (work?.model?.software ?? []).join(', '),
      processNotes: work?.model?.processNotes ?? '',
      modelMediaId: work?.model?.modelMediaId ?? null,
      turntableMediaId: work?.model?.turntableMediaId ?? null,
      polyCount: work?.model?.polyCount == null ? '' : String(work.model.polyCount),
      textured: work?.model?.textured ?? false,
      externalUrl: work?.model?.externalUrl ?? '',
    },
    video: {
      mediaId: work?.video?.mediaId ?? null,
      duration: work?.video?.duration == null ? '' : String(work.video.duration),
      audioCleared: work?.video?.audioCleared ?? false,
      relatedWorkId: work?.video?.relatedWorkId ?? '',
    },
  }
}

function toInput(kind, form) {
  const input = {
    title: form.title,
    year: form.year.trim() === '' ? null : form.year,
    categoryId: form.categoryId || null,
    description: form.description,
    tags: list(form.tags),
    featured: form.featured,
    status: form.status,
    isOwnWork: form.isOwnWork,
    showsRealFace: form.showsRealFace,
    // A consent answer only means something when a face is shown.
    faceConsent: form.showsRealFace && form.faceConsent,
    notesArtist: form.notesArtist,
    notesAdmin: form.notesAdmin,
    coverMediaId: form.coverMediaId,
    gallery: form.gallery,
  }
  if (kind === 'model') {
    const { model } = form
    input.model = {
      software: list(model.software),
      processNotes: model.processNotes,
      modelMediaId: model.modelMediaId,
      turntableMediaId: model.turntableMediaId,
      polyCount: model.polyCount.trim() === '' ? null : model.polyCount,
      textured: model.textured,
      externalUrl: model.externalUrl.trim(),
    }
  }
  if (kind === 'video') {
    const { video } = form
    input.video = {
      mediaId: video.mediaId,
      duration: video.duration.trim() === '' ? null : video.duration,
      audioCleared: video.audioCleared,
      relatedWorkId: video.relatedWorkId || null,
    }
  }
  return input
}

function WorkForm({ kind, work }) {
  const navigate = useNavigate()
  const isNew = !work
  const [form, setForm] = useState(() => toForm(kind, work))
  const [saved, setSaved] = useState(() => JSON.stringify(toForm(kind, work)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [justSaved, setJustSaved] = useState(false)
  // Which kind the gallery picker is open for: 'image', 'video' or closed.
  const [galleryPicker, setGalleryPicker] = useState(null)
  const errorRef = useRef(null)

  const { data: library = [] } = useApi(() => listMedia(), [])
  const { data: categories = [] } = useApi(listCategories, [])
  const { data: otherWorks = [] } = useApi(() => (kind === 'video' ? listWorks({ kind: 'artwork' }) : []), [kind])
  const { data: history = [] } = useApi(() => (work ? listActivity({ entity: 'work', entityId: work.id, limit: 5 }) : []), [work?.id])

  // --- Unsaved changes -------------------------------------------------------
  // A ref, so the blocker and the save handler see the latest value at once.
  const dirty = JSON.stringify(form) !== saved
  const dirtyRef = useRef(false)
  dirtyRef.current = dirty

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname)

  useEffect(() => {
    if (!dirty) return
    const warn = (event) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // --- Editing ---------------------------------------------------------------
  const change = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setJustSaved(false)
    // A field you've started fixing stops showing its old error.
    if (error?.field && Object.keys(patch).includes(error.field)) setError(null)
  }
  const field = (name) => ({
    value: form[name],
    onChange: (event) => change({ [name]: event.target.value }),
  })
  const check = (name) => ({
    checked: form[name],
    onChange: (event) => change({ [name]: event.target.checked }),
  })
  const detail = (group) => ({
    text: (name) => ({
      value: form[group][name],
      onChange: (event) => change({ [group]: { ...form[group], [name]: event.target.value } }),
    }),
    check: (name) => ({
      checked: form[group][name],
      onChange: (event) => change({ [group]: { ...form[group], [name]: event.target.checked } }),
    }),
    media: (name) => ({
      mediaId: form[group][name],
      library,
      onChange: (media) => change({ [group]: { ...form[group], [name]: media?.id ?? null } }),
    }),
  })
  const model = detail('model')
  const video = detail('video')
  const errorFor = (name) => (error?.field === name ? error.message : undefined)

  const blockers = publishBlockers(form)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setJustSaved(false)
    try {
      const input = toInput(kind, form)
      if (isNew) {
        const created = await createWork({ ...input, kind })
        // Mark clean first so leaving for the new work's page isn't blocked.
        dirtyRef.current = false
        navigate(`/admin/works/${created.id}`, { replace: true, viewTransition: false })
      } else {
        const updated = await updateWork(work.id, input)
        // The server may tidy values (tags), so show what it kept.
        const next = toForm(kind, updated)
        setForm(next)
        setSaved(JSON.stringify(next))
        setJustSaved(true)
      }
    } catch (err) {
      setError(err)
      // Move to the message, since the save button is at the bottom of a long page.
      requestAnimationFrame(() => errorRef.current?.focus())
    } finally {
      setBusy(false)
    }
  }

  // Each gallery item with its file from the library; items whose file has
  // gone are dropped by the server on save, so they aren't shown.
  const galleryItems = form.gallery
    .map((item) => ({ ...item, media: library.find((media) => media.id === item.mediaId) }))
    .filter((item) => item.media)
  const moveGallery = (index, by) => {
    const items = [...form.gallery]
    ;[items[index], items[index + by]] = [items[index + by], items[index]]
    change({ gallery: items })
  }
  const setCaption = (mediaId, caption) =>
    change({ gallery: form.gallery.map((item) => (item.mediaId === mediaId ? { ...item, caption } : item)) })

  return (
    <>
      <AdminPageHeader title={isNew ? `New ${KIND_LABELS[kind].toLowerCase()}` : work.title}>
        {isNew ? 'Saved as a draft until you change its status.' : `${KIND_LABELS[kind]} · last edited${work.updatedByName ? ` by ${work.updatedByName}` : ''} ${new Date(work.updatedAt).toLocaleDateString()}`}
      </AdminPageHeader>

      <p className="mb-2 text-caption">
        <Link to="/admin/works" className="text-primary underline-offset-2 hover:underline">← All works</Link>
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div ref={errorRef} tabIndex={-1} className="mb-2">
            <Notice tone="error">{error.message}</Notice>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <Section title="Details">
              <TextField label="Title" required autoFocus={isNew} {...field('title')} error={errorFor('title')} />
              <TextField label="Year" inputMode="numeric" maxLength={4} {...field('year')} error={errorFor('year')} />
              <TextArea label="Description" rows={5} {...field('description')} />
              <TextField label="Tags" hint="Separate with commas." {...field('tags')} />
            </Section>

            {kind === 'model' && (
              <Section title="3D model">
                <MediaField
                  label=".glb file"
                  kind="model"
                  hint="Must be uploaded. The 3D viewer can’t load linked models."
                  error={errorFor('modelMediaId')}
                  {...model.media('modelMediaId')}
                />
                <MediaField label="Turntable image" kind="image" hint="Optional. Shown while the model loads." error={errorFor('turntableMediaId')} {...model.media('turntableMediaId')} />
                <div className="grid gap-1.5 md:grid-cols-2">
                  <TextField label="Software" hint="Separate with commas, like Blender, Substance Painter." {...model.text('software')} />
                  <TextField label="Triangles" inputMode="numeric" {...model.text('polyCount')} error={errorFor('polyCount')} />
                </div>
                <Checkbox label="Textured" {...model.check('textured')} />
                <TextField label="Link to the model elsewhere" type="url" hint="Optional, like a Sketchfab page." placeholder="https://" {...model.text('externalUrl')} error={errorFor('externalUrl')} />
                <TextArea label="Process notes" rows={4} {...model.text('processNotes')} />
              </Section>
            )}

            {kind === 'video' && (
              <Section title="Video">
                <MediaField label="YouTube video" kind="video" required error={errorFor('mediaId')} {...video.media('mediaId')} />
                <div className="grid gap-1.5 md:grid-cols-2">
                  <TextField label="Length in seconds" inputMode="numeric" {...video.text('duration')} error={errorFor('duration')} />
                  <SelectField label="Related artwork" hint="Optional, like the storyboard or still it came from." {...video.text('relatedWorkId')} error={errorFor('relatedWorkId')}>
                    <option value="">None</option>
                    {otherWorks.map((other) => (
                      <option key={other.id} value={other.id}>{other.title}</option>
                    ))}
                  </SelectField>
                </div>
                <Checkbox label="Audio is cleared" hint="The music and sounds are Lui’s, licensed or free to use." {...video.check('audioCleared')} />
              </Section>
            )}

            <Section title="Cover and gallery">
              <MediaField
                label="Cover"
                kind="image"
                required
                hint="Shown on cards and in the Museum."
                error={errorFor('coverMediaId')}
                mediaId={form.coverMediaId}
                library={library}
                onChange={(media) => change({ coverMediaId: media?.id ?? null })}
              />

              <div className="flex flex-col gap-0.5">
                <span className="text-caption font-medium">Gallery</span>
                <p className="text-small text-ink/65">
                  More images and YouTube videos shown with this work, in this order. Captions are optional.
                </p>
                {galleryItems.length === 0 ? (
                  <p className="text-ink/65">Nothing in the gallery.</p>
                ) : (
                  <ol className="flex flex-col divide-y divide-ink/10 rounded-sm border border-ink/15 bg-surface">
                    {galleryItems.map(({ mediaId, caption, media }, index) => {
                      const label = `${media.kind === 'video' ? 'video' : 'image'} ${index + 1}`
                      const captionId = `caption-${mediaId}`
                      return (
                        <li key={mediaId} className="flex flex-col gap-1 p-1 md:flex-row md:items-center md:gap-1.5">
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span className="w-2 shrink-0 text-center font-mono text-small text-ink/65">{index + 1}</span>
                            <MediaThumb media={media} className="size-6" />
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="font-mono text-small text-ink/65 uppercase">{media.kind === 'video' ? 'Video' : 'Image'}</span>
                              <label htmlFor={captionId} className="sr-only">Caption for {label}</label>
                              <input
                                id={captionId}
                                value={caption}
                                placeholder="Caption (optional)"
                                onChange={(event) => setCaption(mediaId, event.target.value)}
                                className="w-full rounded-sm border border-ink/25 bg-surface px-1 py-0.5 text-caption hover:border-ink/45 focus-visible:border-primary"
                              />
                            </div>
                          </div>
                          <span className="flex gap-1 md:shrink-0">
                            <LinkButton disabled={index === 0} onClick={() => moveGallery(index, -1)} aria-label={`Move ${label} up`}>Up</LinkButton>
                            <LinkButton disabled={index === galleryItems.length - 1} onClick={() => moveGallery(index, 1)} aria-label={`Move ${label} down`}>Down</LinkButton>
                            <LinkButton onClick={() => change({ gallery: form.gallery.filter((item) => item.mediaId !== mediaId) })} aria-label={`Remove ${label}`}>Remove</LinkButton>
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                )}
                {errorFor('gallery') && <p role="alert" className="text-caption font-medium">⚠ {errorFor('gallery')}</p>}
                <div className="flex flex-wrap gap-1">
                  <Button variant="outline" onClick={() => setGalleryPicker('image')}>Add an image</Button>
                  <Button variant="outline" onClick={() => setGalleryPicker('video')}>Add a video</Button>
                </div>
                <MediaPicker
                  open={Boolean(galleryPicker)}
                  kind={galleryPicker ?? 'image'}
                  library={library}
                  onClose={() => setGalleryPicker(null)}
                  onPick={(media) => {
                    if (!form.gallery.some((item) => item.mediaId === media.id)) change({ gallery: [...form.gallery, { mediaId: media.id, caption: '' }] })
                    setGalleryPicker(null)
                  }}
                />
              </div>
            </Section>
          </div>

          <div className="flex flex-col gap-3">
            <Section title="Publishing">
              <SelectField label="Status" error={errorFor('status')} {...field('status')}>
                {STATUSES.map((status) => (
                  <option key={status} value={status} disabled={status === 'published' && blockers.length > 0}>
                    {status[0].toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </SelectField>
              <p className="text-small text-ink/65">
                Draft and Ready stay private. Only Published works are on the site. Archived works come off it.
              </p>
              {blockers.length > 0 && (
                <div role="status" className="rounded-sm bg-accent/15 px-1.5 py-1 text-caption">
                  <p className="font-medium">Can’t be published yet:</p>
                  <ul className="list-disc pl-2">
                    {blockers.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Checkbox label="Featured on the home page" {...check('featured')} />
            </Section>

            <Section title="Category">
              <SelectField label="Category" error={errorFor('categoryId')} {...field('categoryId')}>
                <option value="">None</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </SelectField>
            </Section>

            <Section title="Rights">
              <Checkbox label="Lui’s own work" hint="Only own work can be published." {...check('isOwnWork')} />
              <Checkbox label="Shows a real person’s face" {...check('showsRealFace')} />
              {form.showsRealFace && <Checkbox label="They’ve agreed to it being shown" hint="Keep their consent in the Consent and Rights sheet." {...check('faceConsent')} />}
            </Section>

            <Section title="Notes">
              <TextArea label="Notes from Lui" hint="Never shown on the site." rows={3} {...field('notesArtist')} />
              <TextArea label="Notes between admins" hint="Never shown on the site." rows={3} {...field('notesAdmin')} />
            </Section>

            {!isNew && (
              <Section title="History">
                {history.length === 0 ? (
                  <p className="text-caption text-ink/65">No edits recorded yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {history.map((entry) => (
                      <li key={entry.id} className="text-caption">
                        <span className="font-medium">{entry.actorName}</span> {entry.summary.charAt(0).toLowerCase() + entry.summary.slice(1)}
                        <span className="block text-small text-ink/65">{new Date(entry.createdAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 z-[5] -mx-2 mt-3 flex flex-wrap items-center gap-2 border-t border-ink/10 bg-bg/95 px-2 py-1.5 md:-mx-3 md:px-3 lg:-mx-5 lg:px-5">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Save as draft' : 'Save changes'}
          </Button>
          {!isNew && <StatusBadge status={work.status} />}
          <span role="status" className="text-caption text-ink/65">
            {justSaved ? 'Saved.' : dirty ? 'You have unsaved changes.' : ''}
          </span>
        </div>
      </form>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Leave without saving?"
        confirmLabel="Leave and lose changes"
        onCancel={() => blocker.reset()}
        onConfirm={() => blocker.proceed()}
      >
        <p>Your changes to this work haven’t been saved.</p>
      </ConfirmDialog>
    </>
  )
}

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-lg border border-ink/10 bg-surface p-2">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  )
}
