import { useRef, useState } from 'react'
import { addMediaLink, formatBytes, updateMedia, uploadMedia } from '../api/index.js'
import { Button, Dialog, FieldError, LabelMark, LinkButton, Notice, ROW_INPUT, rules, TextField } from './ui.jsx'

// Choosing a file for a work (cover, gallery, .glb, video) or a brand image.
// <MediaField> is the form row: a preview, the current choice, and the buttons.
// It opens <MediaPicker>, a slide-over that lists the library and lets you add
// to it without leaving the form.
//
// Alt text is asked for on the chosen image, where it's clear which picture it
// describes, not before the file is picked.
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
  // The file just picked or added, until the library reload brings it in.
  const [picked, setPicked] = useState(null)
  const media = library.find((item) => item.id === mediaId) ?? (picked?.id === mediaId ? picked : null)
  const copy = KIND_COPY[kind]

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption font-medium">
        {label}
        <LabelMark required={required} optional={!required} />
      </span>
      <div className={`flex items-center gap-2 rounded-sm border bg-surface p-1 ${error ? 'border-2 border-accent' : 'border-ink/25'}`}>
        <MediaThumb media={media} />
        <div className="flex min-w-0 flex-1 flex-col">
          {media ? (
            <>
              <span className="truncate font-medium">{media.altText || 'Chosen image'}</span>
              <span className="text-small text-ink/65">
                {SOURCE_LABELS[media.source]}
                {media.bytes ? ` · ${formatBytes(media.bytes)}` : ''}
              </span>
            </>
          ) : (
            <span className="text-ink/65">{required ? `No ${copy.noun} yet` : `No ${copy.noun}`}</span>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-1">
          <LinkButton onClick={() => setOpen(true)} aria-label={`${media ? 'Change' : 'Choose'} ${label}`}>{media ? 'Change' : 'Choose'}</LinkButton>
          {media && <LinkButton onClick={() => onChange(null)} aria-label={`Remove ${label}`}>Remove</LinkButton>}
        </div>
      </div>
      {error ? <FieldError>{error}</FieldError> : hint && <p className="text-small text-ink/65">{hint}</p>}
      {media && media.kind === 'image' && <AltTextInput key={media.id} media={media} />}

      <MediaPicker
        open={open}
        kind={kind}
        library={library}
        selectedId={mediaId}
        onClose={() => setOpen(false)}
        onPick={(chosen) => {
          setPicked(chosen)
          onChange(chosen)
          setOpen(false)
        }}
      />
    </div>
  )
}

// Describes the chosen picture for people who can't see it. Saves when you
// leave the field, if it changed; the same text is used wherever the image is.
function AltTextInput({ media }) {
  const [alt, setAlt] = useState(media.altText)
  const [state, setState] = useState({ tone: 'info', text: '' })
  const cancelled = useRef(false)
  const id = `alt-${media.id}`

  async function save() {
    // Escape put the old text back; there's nothing to save.
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    if (alt.trim() === media.altText) return
    try {
      await updateMedia(media.id, { altText: alt })
      setState({ tone: 'info', text: 'Alt text saved.' })
    } catch (err) {
      setState({ tone: 'error', text: err.message })
    }
  }

  return (
    <div className="mt-0.5 flex flex-col gap-0.5">
      <label htmlFor={id} className="text-caption font-medium">
        Alt text <span className="font-normal text-ink/65">· describe the picture for people who can’t see it</span>
      </label>
      <input
        id={id}
        value={alt}
        onChange={(event) => { setAlt(event.target.value); setState({ tone: 'info', text: '' }) }}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            // Keep Escape for this field, not the slide-over or dialog around it.
            event.preventDefault()
            event.stopPropagation()
            cancelled.current = true
            setAlt(media.altText)
            event.currentTarget.blur()
          }
        }}
        className={ROW_INPUT + 'border-ink/25'}
      />
      {state.text && <p role={state.tone === 'error' ? 'alert' : 'status'} className="text-small text-ink/65">{state.text}</p>}
    </div>
  )
}

export function MediaPicker({ open, kind, library, selectedId, onClose, onPick }) {
  const copy = KIND_COPY[kind]
  const items = library.filter((item) => item.kind === kind)

  return (
    <Dialog open={open} onClose={onClose} title={`Choose ${/^[aeiou]/i.test(copy.noun) ? 'an' : 'a'} ${copy.noun}`} side>
      <AddMedia kind={kind} onAdded={onPick} />

      <div className="flex flex-col gap-1">
        <h3 className="leading-[1.25] font-bold">In the library</h3>
        {items.length === 0 ? (
          <p className="text-ink/65">Nothing here yet. Add one above.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-1 md:grid-cols-3">
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
                  <span className="truncate text-caption font-medium">{item.altText || 'No description'}</span>
                  <span className="text-small text-ink/65">{SOURCE_LABELS[item.source]}{item.id === selectedId ? ' · chosen' : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

    </Dialog>
  )
}

// Upload a file or paste a link, then hand the result to the caller (the
// picker uses it as the choice; the Media screen just lists it).
// `kind` limits what's accepted; leave it off on the Media screen to take any.
const checkLink = (value) => (!value.trim() ? 'Paste the link first.' : rules.https(value) || '')

export function AddMedia({ kind, onAdded, heading = 'Add new' }) {
  const copy = kind ? KIND_COPY[kind] : { canUpload: true, canLink: true, accept: 'image/*,.glb', linkHint: 'A Google Drive file, a YouTube video or a link to an image.' }
  const fileInput = useRef(null)
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState('')
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
    if (file) run(() => uploadMedia(file))
  }

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-ink/10 bg-bg p-2">
      <h3 className="leading-[1.25] font-bold">{heading}</h3>

      <div className="flex flex-col gap-2 md:flex-row md:items-start">
        {copy.canUpload && (
          <div className={`flex flex-col gap-0.5 ${copy.canLink ? 'md:mt-[1.65rem]' : ''}`}>
            <input ref={fileInput} type="file" accept={copy.accept} onChange={handleFile} className="sr-only" tabIndex={-1} aria-hidden="true" />
            <Button variant="outline" disabled={busy} onClick={() => fileInput.current.click()}>
              {busy ? 'Working…' : 'Upload a file'}
            </Button>
          </div>
        )}

        {copy.canLink && (
          <form
            className="flex flex-1 items-start gap-1"
            onSubmit={(event) => {
              event.preventDefault()
              // React sends events up through portals too, which would submit
              // a work form this dialog was opened from.
              event.stopPropagation()
              const problem = checkLink(link)
              if (problem) {
                setLinkError(problem)
                event.currentTarget.elements.link.focus()
                return
              }
              run(() => addMediaLink(link))
            }}
          >
            <TextField
              className="flex-1"
              label="Or paste a link"
              hint={copy.linkHint}
              type="url"
              inputMode="url"
              name="link"
              value={link}
              onChange={(event) => { setLink(event.target.value); setLinkError('') }}
              onBlur={() => setLinkError(link.trim() ? checkLink(link) : '')}
              error={linkError}
              placeholder="https://"
            />
            {/* Lined up with the input, under the label, so an error below doesn't move it. */}
            <Button type="submit" disabled={busy} className="mt-[1.65rem]">
              Add link
            </Button>
          </form>
        )}
      </div>

      <Notice tone={message.tone}>{message.text}</Notice>
    </div>
  )
}
