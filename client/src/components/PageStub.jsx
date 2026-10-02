import Button from './Button.jsx'
import DisplayTitle from './DisplayTitle.jsx'

// Holds a route's place until its real page is built, so the nav has
// somewhere to land and "Skip to content" still finds a <main>.

export default function PageStub({ title, children }) {
  return (
    <main id="main" className="mx-auto flex max-w-page flex-col items-start justify-center gap-2 px-2 py-6 md:px-3 lg:px-5 lg:py-8">
      <DisplayTitle text={title} entrance className="font-display text-display text-primary" />
      <p className="max-w-[36rem] text-ink/65">{children}</p>
      <Button variant="outline" href="/" className="mt-1.5">← Back to home</Button>
    </main>
  )
}
