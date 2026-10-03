import { useState } from 'react'
import logoMark from '../assets/logo-mark.png'
import { BUNNIES } from '../data/stickers.js'

// The centred card the login and password-reset pages share: the logo, a
// heading, and the bunny asleep on his laptop sat on the top edge. It's the
// only sticker in the admin, and it stays put (no peeking or slapping).
export default function AuthCard({ title, children }) {
  return (
    // Extra room on top for the bunny, which sits above the card.
    <main className="flex min-h-svh items-center justify-center px-2 pt-10 pb-6">
      <div className="relative w-full max-w-[26rem]">
        <img
          src={BUNNIES.workingHardly.src}
          alt=""
          className="absolute -top-7 right-2 w-[7.5rem] rotate-3"
        />

        <div className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-surface px-3 py-4 shadow-[0_1px_2px_rgb(11_21_51/0.06)] md:px-4">
          <div className="flex flex-col items-start gap-2">
            <img src={logoMark} alt="" width="45" height="34" className="h-[34px] w-[45px] object-contain" />
            <div>
              <p className="font-mono text-small text-ink/65">LUINSOMNIAC ADMIN</p>
              <h1 className="font-display text-heading text-primary">{title}</h1>
            </div>
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}

// A labelled input. The label sits above, always visible. `validate` runs when
// you leave the field (not while typing) and returns a message or nothing; the
// message clears as soon as you edit. `error` comes from the parent on submit.
export function Field({ label, id, validate, error, onFix, ...input }) {
  const [blurError, setBlurError] = useState('')
  const shown = error || blurError
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={id} className="text-caption font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={shown ? true : undefined}
        aria-describedby={shown ? `${id}-error` : undefined}
        onBlur={(event) => setBlurError(validate?.(event.target.value) || '')}
        onInput={() => { setBlurError(''); onFix?.() }}
        className={`min-h-[2.75rem] rounded-sm border bg-surface px-1.5 py-1 text-body text-ink hover:border-ink/45 focus-visible:border-primary ${shown ? 'border-2 border-accent' : 'border-ink/25'}`}
        {...input}
      />
      {shown && (
        <p id={`${id}-error`} role="alert" className="text-caption font-medium">
          <span aria-hidden="true">⚠ </span>
          {shown}
        </p>
      )}
    </div>
  )
}
