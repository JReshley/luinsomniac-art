import { useRef, useState } from 'react'
import Button from '../components/Button.jsx'
import { addMediaLink, formatBytes, uploadMedia } from '../api/index.js'
import { Dialog, LinkButton, Notice, TextField } from './ui.jsx'

// Choosing a file for a work (cover, gallery, .glb, video) or a brand image.
// <MediaField> is the form row: a preview, the current choice, and the buttons.
// It opens <MediaPicker>, which lists the library and lets you add to it
// without leaving the form.
//
// The parent loads the library once (useApi(listMedia)) and passes it down as
// `library`, so a form with several pickers makes one request, not five.

export const SOURCE_LABELS = { supabase: 'Uploaded', gdrive: 'Drive', youtube: 'YouTube', external: 'Web link' }

const KIND_COPY = {
  image: { noun: 'image', accept: 'image/png,image/jpeg,image/webp,image/gif', canUpload: true, canLink: true, linkHint: 'A Google Drive file or a link to an image.' },
  model: { noun: '3D model', accept: '.glb', canUpload: true, canLink: false },
  video: { noun: 'video', canUpload: false, canLink: true, linkHint: 'The link from Share on the video’s YouTube page.' },
}

// A preview square: the picture if there is one, else a labelled tile.
export function MediaThumb({ media, className = 'size-8' }) {
  const frame = `${className} shrink-0 overflow-hidden rounded-sm border border-ink/10 bg-ink/5`
  if (media?.thumbnailUrl) {
    return <img src={media.thumbnailUrl} alt="" loading="lazy" className={`${frame} object-cover`} />
  }
  return (
    <span className={`${frame} flex items-center justify-center font-mono text-small text-ink/65 uppercase`}>
      {media ? (media.kind === 'model' ? '.glb' : media.kind) : 'none'}
    </span>
  )
}

export function MediaField({ label, kind, mediaId, library, onChange, hint, error, required = false }) {
  const [open, setOpen] = useState(false)
  const media = library.find((item) => item.id === mediaId) ?? null
  const copy = KIND_COPY[kind]

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption font-medium">{label}</span>
      <div className={`flex items-center gap-1.5 rounded-sm border bg-surface p-1 ${error ? 'border-2 border-accent' : 'border-ink/25'}`}>
        <MediaThumb media={media} />
        <div className="flex min-w-0 flex-1 flex-col">
          {media ? (
            <>
              <span className="truncate font-medium">{media.altText || `No alt text`}</span>
              <span className="text-small text-ink/65">
                {SOURCE_LABELS[media.source]}
                {media.bytes ? ` · ${formatBytes(media.bytes)}` : ''}
              </span>
            </>
          ) : (
            <span className="text-ink/65">{required ? `No ${copy.noun} yet` : `No ${copy.noun}`}</span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <LinkButton onClick={() => setOpen(true)}>{media ? 'Change' : 'Choose'}</LinkButton>
          {media && <LinkButton onClick={() => onChange(null)}>Remove</LinkButton>}
        </div>
      </div>
      {hint && <p className="text-small text-ink/65">{hint}</p>}
      {error && (
        <p role="alert" className="text-caption font-medium">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}

      <MediaPicker
        open={open}
        kind={kind}
        library={library}
        selectedId={mediaId}
        onClose={() => setOpen(false)}
        onPick={(picked) => {
          onChange(picked)
          setOpen(false)
        }}
      />
    </div>
  )
}

export function MediaPicker({ open, kind, library, selectedId, onClose, onPick }) {
  const copy = KIND_COPY[kind]
  const items = library.filter((item) => item.kind === kind)

  return (
    <Dialog open={open} onClose={onClose} title={`Choose ${/^[aeiou]/i.test(copy.noun) ? 'an' : 'a'} ${copy.noun}`} wide>
      <AddMedia kind={kind} onAdded={onPick} />

      <div className="flex flex-col gap-1">
        <h3 className="font-bold">In the library</h3>
        {items.length === 0 ? (
          <p className="text-ink/65">Nothing here yet. Add one above.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-1 md:grid-cols-4">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onPick(item)}
                  aria-pressed={item.id === selectedId}
                  className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-sm border p-1 text-left hover:border-primary/60 hover:bg-primary/5 ${
                    item.id === selectedId ? 'border-2 border-primary' : 'border-ink/15'
                  }`}
                >
                  <MediaThumb media={item} className="aspect-square w-full" />
                  <span className="truncate text-caption font-medium">{item.altText || 'No alt text'}</span>
                  <span className="text-small text-ink/65">{SOURCE_LABELS[item.source]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  )
}

// Upload a file or paste a link, then hand the result to the caller (the
// picker uses it as the choice; the Media screen just lists it).
// `kind` limits what's accepted; leave it off on the Media screen to take any.
export function AddMedia({ kind, onAdded, heading = 'Add new' }) {
  const copy = kind ? KIND_COPY[kind] : { canUpload: true, canLink: true, accept: 'image/*,.glb', linkHint: 'A Google Drive file, a YouTube video or a link to an image.' }
  const fileInput = useRef(null)
  const [altText, setAltText] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState({ tone: 'info', text: '' })

  async function run(job) {
    setBusy(true)
    setMessage({ tone: 'info', text: '' })
    try {
      const media = await job()
      if (kind && media.kind !== kind) {
        setMessage({ tone: 'error', text: `That’s ${/^[aeiou]/i.test(media.kind) ? 'an' : 'a'} ${media.kind === 'model' ? '3D model' : media.kind}, and this needs ${/^[aeiou]/i.test(copy.noun) ? 'an' : 'a'} ${copy.noun}.` })
        return
      }
      setLink('')
      setAltText('')
      if (media.duplicate) setMessage({ tone: 'info', text: 'That file was already in the library, so it wasn’t added twice.' })
      onAdded?.(media)
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  function handleFile(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (file) run(() => uploadMedia(file, { altText }))
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-sm border border-ink/10 bg-bg p-1.5">
      <h3 className="font-bold">{heading}</h3>

      {(!kind || kind === 'image') && (
        <TextField
          label="Alt text"
          hint="Describe the picture for people who can’t see it. Applies to what you add next."
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
        />
      )}

      <div className="flex flex-col gap-1.5 md:flex-row md:items-end">
        {copy.canUpload && (
          <div className="flex flex-col gap-0.5">
            <input ref={fileInput} type="file" accept={copy.accept} onChange={handleFile} className="sr-only" tabIndex={-1} aria-hidden="true" />
            <Button variant="outline" disabled={busy} onClick={() => fileInput.current.click()}>
              {busy ? 'Working…' : 'Upload a file'}
            </Button>
          </div>
        )}

        {copy.canLink && (
          <form
            className="flex flex-1 items-end gap-1"
            onSubmit={(event) => {
              event.preventDefault()
              // React sends events up through portals too, which would submit
              // a work form this dialog was opened from.
              event.stopPropagation()
              run(() => addMediaLink(link, { altText }))
            }}
          >
            <TextField
              className="flex-1"
              label="Or paste a link"
              hint={copy.linkHint}
              type="url"
              inputMode="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://"
            />
            <Button type="submit" disabled={busy || !link.trim()}>
              Add link
            </Button>
          </form>
        )}
      </div>

      <Notice tone={message.tone}>{message.text}</Notice>
    </div>
  )
}
