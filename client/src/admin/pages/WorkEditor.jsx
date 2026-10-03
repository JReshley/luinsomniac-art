import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  archiveWork,
  createWork,
  getWork,
  KINDS,
  listActivity,
  listCategories,
  listMedia,
  publishBlockers,
  setWorkStatus,
  updateWork,
  useApi,
} from '../../api/index.js'
import AdminPageHeader from '../AdminPageHeader.jsx'
import { MediaField, MediaPicker, MediaThumb } from '../MediaPicker.jsx'
import {
  Button,
  Checkbox,
  clearDraft,
  ConfirmDialog,
  DraftNotice,
  FieldError,
  focusField,
  KIND_LABELS,
  LinkButton,
  LoadError,
  Notice,
  readDraft,
  ROW_INPUT,
  rules,
  SelectField,
  shownStatus,
  Skeleton,
  StatusBadge,
  TextArea,
  TextField,
  useDraft,
  useValidation,
} from '../ui.jsx'

// The full-page editor for one work, new or existing (page pattern: Form). The
// route decides which: /admin/works/new?kind=model starts a blank one,
// /admin/works/:id loads one.
//
// There is no slug field. A work's address part is made from its title when it's
// first saved and never changes after, so renaming a work can't break a link to
// it. (The data layer makes it when the form sends none.)
//
// The form keeps its own copy of the work as plain strings (a tag list is one
// comma-separated field, a year is text) and turns it into what the API wants
// on save. Simple checks run when you leave a field; whatever the API still
// rejects comes back with a `field` name and is shown under that input.
// Unsaved edits are kept in this browser (useDraft) until they're saved.
//
// One column, in the order a work is put together: what it is, its files, the
// extras, then publishing. A few stored fields the public site doesn't show (a
// video's length, audio clearance and related work) have no input; their saved
// values are carried through untouched.

export default function WorkEditor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const kind = params.get('kind')

  if (!id && !KINDS.includes(kind)) return <ChooseKind />
  return id ? <EditExisting id={id} /> : <WorkForm key={kind} kind={kind} />
}

const KIND_CHOICES = [
  ['artwork', 'Add an artwork', 'A drawing, painting or other image.'],
  ['model', 'Add a 3D model', 'A .glb file people can turn around in the 3D Showcase.'],
  ['video', 'Add a video', 'An animation or reel hosted on YouTube.'],
]

function ChooseKind() {
  return (
    <>
      <AdminPageHeader title="Add work">What are you adding?</AdminPageHeader>
      <ul className="grid max-w-[48rem] gap-2 md:grid-cols-3">
        {KIND_CHOICES.map(([kind, label, description]) => (
          <li key={kind}>
            <Link
              to={`/admin/works/new?kind=${kind}`}
              className="flex h-full flex-col gap-0.5 rounded-lg border border-ink/15 bg-surface p-2 no-underline transition-colors duration-150 ease-out hover:border-primary/60 hover:bg-primary/5"
            >
              <span className="font-bold text-primary">{label} →</span>
              <span className="text-caption text-ink/65">{description}</span>
            </Link>
          </li>
        ))}
      </ul>
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
        <AdminPageHeader title="Work not found">It may have been removed. Pick it again from the list.</AdminPageHeader>
        <Button href="/admin/works" variant="outline">Back to all works</Button>
      </>
    )
  }
  if (!loaded) {
    return (
      <>
        <AdminPageHeader title="Edit work" />
        {error ? <LoadError what="work" error={error} /> : <Skeleton rows={5} className="max-w-[40rem]" />}
      </>
    )
  }
  return <WorkForm key={loaded.id} kind={loaded.kind} work={loaded} />
}

// --- The form ---------------------------------------------------------------

const list = (text) => text.split(',').map((item) => item.trim()).filter(Boolean)

// The category a new work starts in: the one last saved on a work, since works
// tend to be added in batches of the same kind of thing.
const LAST_CATEGORY_KEY = 'luinsomniac-admin-last-category'
function lastCategory() {
  try {
    return localStorage.getItem(LAST_CATEGORY_KEY) ?? ''
  } catch {
    return ''
  }
}
function rememberCategory(categoryId) {
  try {
    if (categoryId) localStorage.setItem(LAST_CATEGORY_KEY, categoryId)
  } catch {
    // Storage blocked: new works just start with no category.
  }
}

const NEW_TITLES = { artwork: 'New artwork', model: 'New 3D model', video: 'New video' }

// What the main picture is called for each kind, and what it's for.
const COVER_COPY = {
  artwork: ['Image', 'The artwork itself, shown on cards, in the Museum and when opened.'],
  model: ['Poster image', 'A still of the model, shown on cards and in the Museum.'],
  video: ['Thumbnail', 'Shown on cards and in the Museum before the video plays.'],
}

// Checked when you leave each field, and all together on save. Model fields
// are named model.<name>, matching the inputs' name attributes.
const FIELD_RULES = {
  title: rules.required('Give the work a title.'),
  year: rules.year,
  'model.polyCount': rules.wholeNumber('Enter the triangle count as a whole number, like 184000.'),
  'model.externalUrl': rules.https,
}
const valuesOf = (form) => ({ title: form.title, year: form.year, 'model.polyCount': form.model.polyCount, 'model.externalUrl': form.model.externalUrl })

// The API names a model or video field without its group ("polyCount").
const MODEL_FIELDS = ['polyCount', 'externalUrl', 'modelMediaId', 'turntableMediaId', 'software', 'processNotes']
const fieldKey = (field) => (MODEL_FIELDS.includes(field) ? `model.${field}` : field)

function toForm(kind, work) {
  return {
    title: work?.title ?? '',
    categoryId: work ? work.categoryId ?? '' : lastCategory(),
    year: work?.year == null ? '' : String(work.year),
    description: work?.description ?? '',
    tags: (work?.tags ?? []).join(', '),
    featured: work?.featured ?? false,
    // 'ready' is private like a draft and is shown as one (ui.jsx).
    status: shownStatus(work?.status ?? 'draft'),
    isOwnWork: work?.isOwnWork ?? true,
    showsRealFace: work?.showsRealFace ?? false,
    faceConsent: work?.faceConsent ?? false,
    // One notes box. Older works may have notes in both stored fields; they're
    // shown together and saved back as one.
    notes: [work?.notesArtist, work?.notesAdmin].filter((text) => text?.trim()).join('\n\n'),
    coverMediaId: work?.coverMediaId ?? null,
    gallery: (work?.gallery ?? []).map((media) => ({ mediaId: media.id, caption: media.caption ?? '' })),
    model: {
      modelMediaId: work?.model?.modelMediaId ?? null,
      turntableMediaId: work?.model?.turntableMediaId ?? null,
      software: (work?.model?.software ?? []).join(', '),
      polyCount: work?.model?.polyCount == null ? '' : String(work.model.polyCount),
      textured: work?.model?.textured ?? false,
      externalUrl: work?.model?.externalUrl ?? '',
      processNotes: work?.model?.processNotes ?? '',
    },
    video: {
      mediaId: work?.video?.mediaId ?? null,
      // No inputs; kept so a save doesn't clear them.
      duration: work?.video?.duration ?? null,
      audioCleared: work?.video?.audioCleared ?? false,
      relatedWorkId: work?.video?.relatedWorkId ?? null,
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
    notesArtist: form.notes.trim(),
    notesAdmin: '',
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
  if (kind === 'video') input.video = { ...form.video }
  return input
}

function WorkForm({ kind, work }) {
  const navigate = useNavigate()
  const isNew = !work
  const draftKey = isNew ? `new-${kind}` : `work-${work.id}`
  const [draft] = useState(() => readDraft(draftKey))
  const [form, setForm] = useState(() => draft?.value ?? toForm(kind, work))
  const [saved, setSaved] = useState(() => JSON.stringify(toForm(kind, work)))
  const [restoredAt, setRestoredAt] = useState(draft?.at ?? null)
  const [busy, setBusy] = useState(false)
  // A save failure that isn't about one field.
  const [error, setError] = useState(null)
  const [justSaved, setJustSaved] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  // Which kind the gallery picker is open for: 'image', 'video' or closed.
  const [galleryPicker, setGalleryPicker] = useState(null)
  const errorRef = useRef(null)
  const validation = useValidation(FIELD_RULES)

  const { data: library = [] } = useApi(() => listMedia(), [])
  const { data: categories = [] } = useApi(listCategories, [])
  const { data: history = [] } = useApi(() => (work ? listActivity({ entity: 'work', entityId: work.id, limit: 5 }) : []), [work?.id])

  // --- Unsaved changes -------------------------------------------------------
  // A ref, so the blocker and the save handler see the latest value at once.
  const dirty = JSON.stringify(form) !== saved
  const dirtyRef = useRef(false)
  dirtyRef.current = dirty
  useDraft(draftKey, form, dirty)

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
  }
  const field = (name) => ({
    name,
    value: form[name],
    onChange: (event) => {
      change({ [name]: event.target.value })
      validation.clear(name)
    },
    onBlur: FIELD_RULES[name] ? validation.blur(name, form[name]) : undefined,
    error: validation.errors[name],
  })
  const check = (name) => ({
    checked: form[name],
    onChange: (event) => change({ [name]: event.target.checked }),
  })
  const detail = (group) => ({
    text: (name) => ({
      name: `${group}.${name}`,
      value: form[group][name],
      onChange: (event) => {
        change({ [group]: { ...form[group], [name]: event.target.value } })
        validation.clear(`${group}.${name}`)
      },
      onBlur: FIELD_RULES[`${group}.${name}`] ? validation.blur(`${group}.${name}`, form[group][name]) : undefined,
      error: validation.errors[`${group}.${name}`],
    }),
    check: (name) => ({
      checked: form[group][name],
      onChange: (event) => change({ [group]: { ...form[group], [name]: event.target.checked } }),
    }),
    media: (name) => ({
      mediaId: form[group][name],
      library,
      error: validation.errors[fieldKey(name)] || validation.errors[name],
      onChange: (media) => {
        change({ [group]: { ...form[group], [name]: media?.id ?? null } })
        validation.clear(fieldKey(name))
      },
    }),
  })
  const model = detail('model')
  const video = detail('video')

  const blockers = publishBlockers(form)
  const archived = form.status === 'archived'

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setJustSaved(false)
    const first = validation.checkAll(valuesOf(form))
    if (first) return focusField(first)

    setBusy(true)
    try {
      const input = toInput(kind, form)
      rememberCategory(form.categoryId)
      if (isNew) {
        const created = await createWork({ ...input, kind })
        // Mark clean first so leaving for the new work's page isn't blocked.
        dirtyRef.current = false
        clearDraft(draftKey)
        navigate(`/admin/works/${created.id}`, { replace: true, viewTransition: false })
      } else {
        const updated = await updateWork(work.id, input)
        // The server may tidy values (tags), so show what it kept.
        const next = toForm(kind, updated)
        setForm(next)
        setSaved(JSON.stringify(next))
        setRestoredAt(null)
        setJustSaved(true)
      }
    } catch (err) {
      if (err.field) {
        validation.set(fieldKey(err.field), err.message)
        focusField(fieldKey(err.field))
      } else {
        setError(err)
        // Move to the message, since the save button is at the bottom of a long page.
        requestAnimationFrame(() => errorRef.current?.focus())
      }
    } finally {
      setBusy(false)
    }
  }

  function discardDraft() {
    clearDraft(draftKey)
    setForm(JSON.parse(saved))
    setRestoredAt(null)
    validation.reset()
  }

  // Archive and restore save straight away, like the buttons on the works list.
  async function archive() {
    setBusy(true)
    try {
      await archiveWork(work.id)
      dirtyRef.current = false
      clearDraft(draftKey)
      navigate('/admin/works', { viewTransition: false })
    } catch (err) {
      setError(err)
      setBusy(false)
      setConfirmArchive(false)
    }
  }

  async function restore() {
    setBusy(true)
    setError(null)
    try {
      await setWorkStatus(work.id, 'draft')
      // Only the status changed on the server; other edits stay unsaved.
      setForm((prev) => ({ ...prev, status: 'draft' }))
      setSaved((prev) => JSON.stringify({ ...JSON.parse(prev), status: 'draft' }))
    } catch (err) {
      setError(err)
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

  const [coverLabel, coverHint] = COVER_COPY[kind]
  const savedStatus = JSON.parse(saved).status
  const saveLabel = isNew ? (form.status === 'published' ? 'Publish work' : 'Save draft') : 'Save changes'

  return (
    <>
      <p className="mb-1 text-caption">
        <Link to="/admin/works" className="inline-flex min-h-[2.75rem] items-center text-primary underline-offset-2 hover:underline">← Back to all works</Link>
      </p>

      <AdminPageHeader title={isNew ? NEW_TITLES[kind] : work.title}>
        {isNew
          ? 'Fill in what you have. A draft can be saved without its files.'
          : `${KIND_LABELS[kind]} · last edited${work.updatedByName ? ` by ${work.updatedByName}` : ''} ${new Date(work.updatedAt).toLocaleDateString()}`}
      </AdminPageHeader>

      <form onSubmit={handleSubmit} noValidate className="flex max-w-[40rem] flex-col">
        <div className="mb-2 flex flex-col gap-1 empty:hidden">
          <DraftNotice at={restoredAt} onDiscard={discardDraft} />
          {error && (
            <div ref={errorRef} tabIndex={-1}>
              <Notice tone="error">{error.message}</Notice>
            </div>
          )}
        </div>
        <p className="mb-1 text-small text-ink/65">
          Fields marked <span aria-hidden="true" className="text-accent">*</span>
          <span className="sr-only">with a star</span> are needed to publish.
        </p>

        <Section title="Details" first>
          <TextField label="Title" required autoFocus={isNew} {...field('title')} />
          <div className="grid gap-2 md:grid-cols-[2fr_1fr]">
            <SelectField label="Category" optional hint="The Museum filter it appears under." {...field('categoryId')}>
              <option value="">None</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </SelectField>
            <TextField label="Year" optional inputMode="numeric" maxLength={4} placeholder="2026" {...field('year')} />
          </div>
          <TextArea label="Description" optional rows={5} {...field('description')} />
        </Section>

        <Section title="Files">
          {kind === 'model' && (
            <MediaField
              label=".glb file"
              kind="model"
              required
              hint="The model people turn around in the 3D Showcase. It must be uploaded; linked models don’t load."
              {...model.media('modelMediaId')}
            />
          )}
          {kind === 'video' && <MediaField label="YouTube video" kind="video" required {...video.media('mediaId')} />}
          <MediaField
            label={coverLabel}
            kind="image"
            required
            hint={coverHint}
            error={validation.errors.coverMediaId}
            mediaId={form.coverMediaId}
            library={library}
            onChange={(media) => {
              change({ coverMediaId: media?.id ?? null })
              validation.clear('coverMediaId')
            }}
          />
          {kind === 'model' && (
            <MediaField
              label="Turntable"
              kind="image"
              hint="An animated spin, as a GIF or WebP, offered as another view in the Showcase."
              {...model.media('turntableMediaId')}
            />
          )}
        </Section>

        {kind === 'model' && (
          <Section title="Model details" note="Shown beside the model in the 3D Showcase.">
            <div className="grid gap-2 md:grid-cols-2">
              <TextField label="Software" optional hint="Separate with commas." placeholder="Blender, Substance Painter" {...model.text('software')} />
              <TextField label="Triangles" optional inputMode="numeric" placeholder="184000" {...model.text('polyCount')} />
            </div>
            <Checkbox label="Textured" {...model.check('textured')} />
            <TextField label="Tags" optional hint="Separate with commas." placeholder="props, diner" {...field('tags')} />
            <TextArea label="Process notes" optional hint="How it was made." rows={4} {...model.text('processNotes')} />
            <TextField label="Link to the model elsewhere" optional type="url" hint="Like its Sketchfab page." placeholder="https://" {...model.text('externalUrl')} />
          </Section>
        )}

        <Section title="Gallery" note="Optional. More images and YouTube videos shown with this work, in this order.">
          {galleryItems.length > 0 && (
            <ol className="flex flex-col divide-y divide-ink/10 rounded-sm border border-ink/15 bg-surface">
              {galleryItems.map(({ mediaId, caption, media }, index) => {
                const label = `${media.kind === 'video' ? 'video' : 'image'} ${index + 1}`
                const captionId = `caption-${mediaId}`
                return (
                  <li key={mediaId} className="flex flex-col gap-1 p-1 md:flex-row md:items-center md:gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="w-2 shrink-0 text-center font-mono text-small text-ink/65">{index + 1}</span>
                      <MediaThumb media={media} className="size-6" />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <label htmlFor={captionId} className="text-caption font-medium">
                          Caption <span className="font-normal text-ink/65">(optional)</span>
                        </label>
                        <input
                          id={captionId}
                          value={caption}
                          onChange={(event) => setCaption(mediaId, event.target.value)}
                          className={ROW_INPUT + 'border-ink/25'}
                        />
                      </div>
                    </div>
                    <span className="flex gap-1 md:shrink-0">
                      <LinkButton disabled={index === 0} onClick={() => moveGallery(index, -1)} aria-label={`Move ${label} up`}>Move up</LinkButton>
                      <LinkButton disabled={index === galleryItems.length - 1} onClick={() => moveGallery(index, 1)} aria-label={`Move ${label} down`}>Move down</LinkButton>
                      <LinkButton onClick={() => change({ gallery: form.gallery.filter((item) => item.mediaId !== mediaId) })} aria-label={`Remove ${label}`}>Remove</LinkButton>
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
          <FieldError>{validation.errors.gallery}</FieldError>
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
        </Section>

        <Section title="Publishing">
          <fieldset className="flex flex-col gap-0.5">
            <legend className="mb-0.5 text-caption font-medium">Rights</legend>
            <Checkbox label="Lui’s own work" {...check('isOwnWork')} />
            <Checkbox label="Shows a real person’s face" {...check('showsRealFace')} />
            {form.showsRealFace && (
              <Checkbox label="They’ve agreed to it being shown" hint="Keep their consent in the Consent and Rights sheet." {...check('faceConsent')} />
            )}
          </fieldset>

          {archived ? (
            <div className="flex flex-col items-start gap-1">
              <p className="text-caption">Archived. It’s hidden from the site, and nothing is deleted.</p>
              <Button variant="outline" disabled={busy} onClick={restore}>Restore as draft</Button>
            </div>
          ) : (
            <fieldset className="flex flex-col gap-0.5">
              <legend className="mb-0.5 text-caption font-medium">Status</legend>
              <StatusOption value="draft" form={form} change={change} label="Draft" hint="Only admins can see it." />
              <StatusOption value="published" form={form} change={change} label="Published" hint="On the public site." disabled={blockers.length > 0} />
              {blockers.length > 0 && (
                <div role="status" className="mt-0.5 rounded-sm bg-accent/15 px-1.5 py-1 text-caption">
                  <p className="font-medium">Can’t be published yet. Fix this under Rights:</p>
                  <ul className="list-disc pl-2">
                    {blockers.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              <FieldError>{validation.errors.status}</FieldError>
            </fieldset>
          )}

          <Checkbox label="Feature on the home page" hint="Only published works appear there." {...check('featured')} />
        </Section>

        <Section title="Private notes">
          <TextArea label="Notes" optional hint="For the two of you. Never shown on the site." rows={4} {...field('notes')} />
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

        {!isNew && !archived && (
          <Section title="Archive">
            <div className="flex flex-col items-start gap-0.5">
              <p className="text-caption text-ink/80">Takes it off the site. Nothing is deleted, and it can be restored later.</p>
              <Button variant="danger-outline" disabled={busy} onClick={() => setConfirmArchive(true)}>
                Archive this work
              </Button>
            </div>
          </Section>
        )}

        <div className="sticky bottom-0 z-[5] -mx-2 mt-3 flex flex-wrap items-center gap-1 border-t border-ink/10 bg-bg/95 px-2 py-2 md:-mx-3 md:px-3 lg:-mx-5 lg:px-5">
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : saveLabel}</Button>
          <Button href="/admin/works" variant="outline">Cancel</Button>
          {!isNew && <StatusBadge status={savedStatus} />}
          <span role="status" className="text-caption text-ink/65">
            {justSaved ? 'Saved.' : dirty ? 'Unsaved changes, kept in this browser until you save.' : ''}
          </span>
        </div>
      </form>

      {!isNew && (
        <ConfirmDialog
          open={confirmArchive}
          title={`Archive “${work.title}”?`}
          confirmLabel={`Archive “${work.title}”`}
          busy={busy}
          onCancel={() => setConfirmArchive(false)}
          onConfirm={archive}
        >
          <p>It comes off the public site. Nothing is deleted, and you can restore it from the Archived filter on the works list.</p>
          {dirty && <p className="mt-1 font-medium">Your unsaved changes on this page will be lost.</p>}
        </ConfirmDialog>
      )}

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title={isNew ? 'Leave this new work without saving?' : `Leave “${work.title}” without saving?`}
        confirmLabel="Leave and lose changes"
        onCancel={() => blocker.reset()}
        onConfirm={() => {
          clearDraft(draftKey)
          blocker.proceed()
        }}
      >
        <p>Your changes to this work haven’t been saved, and they’ll be discarded.</p>
      </ConfirmDialog>
    </>
  )
}

// One choice of the status radio group, with a line saying what it means.
function StatusOption({ value, form, change, label, hint, disabled = false }) {
  const id = `status-${value}`
  return (
    <div className={`flex min-h-[2.75rem] items-start gap-1 py-0.5 ${disabled ? 'opacity-60' : ''}`}>
      <input
        id={id}
        type="radio"
        name="status"
        value={value}
        checked={form.status === value}
        disabled={disabled}
        onChange={() => change({ status: value })}
        className="mt-0.5 size-2 shrink-0 cursor-pointer accent-primary disabled:cursor-default"
      />
      <label htmlFor={id} className={disabled ? '' : 'cursor-pointer'}>
        <span className="text-body">{label}</span>
        <span className="block text-small text-ink/65">{hint}</span>
      </label>
    </div>
  )
}

// A group of fields under a heading, divided from the one above by a hairline
// rather than boxed in a card.
function Section({ title, note, first = false, children }) {
  return (
    <section className={`flex flex-col gap-2 py-2 ${first ? '' : 'border-t border-ink/10'}`}>
      <div>
        <h2 className="text-lead leading-[1.25] font-bold">{title}</h2>
        {note && <p className="text-caption text-ink/65">{note}</p>}
      </div>
      {children}
    </section>
  )
}
