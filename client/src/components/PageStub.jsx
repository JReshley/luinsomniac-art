import Button from './Button.jsx'
import DisplayTitle from './DisplayTitle.jsx'

// Holds a route's place until its real page is built, so the nav has
// somewhere to land and "Skip to content" still finds a <main>.
//
// `sticker` is an optional decorative image: above the text on phones, to
// its right from md up.

export default function PageStub({ title, sticker, children }) {
  return (
    <main
      id="main"
      className="mx-auto flex max-w-page flex-col items-start justify-center gap-3 px-2 py-6 md:flex-row md:items-center md:justify-start md:gap-8 md:px-3 lg:px-5 lg:py-8"
    >
      <div className="flex flex-col items-start gap-2">
        <DisplayTitle text={title} entrance className="font-display text-display text-primary" />
        <p className="max-w-[36rem] text-ink/65">{children}</p>
        <Button variant="outline" href="/" className="mt-1.5">← Back to home</Button>
      </div>

      {sticker && (
        <img
          src={sticker}
          alt=""
          className="order-first w-[9rem] rotate-6 drop-shadow-[0_6px_6px_rgb(11_21_51/0.25)] motion-safe:animate-pop-in motion-safe:[animation-delay:500ms] md:order-none md:w-[15rem]"
        />
      )}
    </main>
  )
}
