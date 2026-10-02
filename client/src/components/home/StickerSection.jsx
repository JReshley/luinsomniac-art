import DisplayTitle from '../DisplayTitle.jsx'
import { StickerSheet } from './StickerBoard.jsx'

// The band that holds the sticker sheet. The stickers themselves can go
// anywhere on the home page (StickerBoard.jsx); this is just where they start.
// Orange, so the sheet reads as something to play with rather than more work
// on display. Navy text: it is 6.5 : 1 on this orange.

export default function StickerSection({ board }) {
  return (
    <section className="bg-accent px-2 py-6 md:px-3 lg:px-5 lg:py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 md:flex-row md:justify-between md:gap-5">
        <div className="flex max-w-[30rem] flex-col gap-1">
          <DisplayTitle as="h2" text="Peel & stick" className="font-display text-heading text-ink" />
          <p className="text-ink">
            Lui&rsquo;s box cats, ready to peel. Drag one off the sheet and stick it anywhere on this page,
            the artwork included. Drop it back on the sheet to put it away.
          </p>
        </div>

        <StickerSheet board={board} className="w-full max-w-[22rem] md:w-[24rem] md:max-w-none" />
      </div>
    </section>
  )
}
