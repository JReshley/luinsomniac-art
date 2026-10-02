import Button from './Button.jsx'

const EMAIL = 'luinsomniac@gmail.com'

export default function Footer() {
  return (
    <footer className="bg-ink px-2 py-6 md:px-3 lg:px-5 lg:py-8" id="contact">
      <div className="mx-auto flex max-w-page flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-heading text-bg">Have an idea in mind? Let&rsquo;s talk!</h2>
            <p className="text-bg/65">
              Commisions open for 3D props, background, and short-form animation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onDark href={`mailto:${EMAIL}`}>
              {EMAIL}
            </Button>
            <Button variant="accent" href={`mailto:${EMAIL}`}>
              Let&rsquo;s collaborate
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-1.5 border-t border-bg/10 pt-2.5 font-mono text-small text-bg/65 uppercase">
          <span>All artwork &copy; Luinsomniac. Do not reproduce without permission.</span>
          <span>WEBSITE BUILT BY <a className="text-bg underline-offset-2 hover:underline" href="https://github.com/JReshley" target="_blank" rel="noopener noreferrer">JRESHLEY</a></span>
        </div>
      </div>
    </footer>
  )
}
