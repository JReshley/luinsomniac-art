import Button from './Button.jsx'

const EMAIL = 'luinsomniac@gmail.com'

// TODO: replace the placeholder hrefs with Lui's real profile links.
const SOCIALS = [
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/' },
  { id: 'vgen', label: 'VGen', href: 'https://vgen.co/' },
]

export default function Footer() {
  return (
    <footer className="bg-ink px-2 py-6 md:px-3 lg:px-5 lg:py-8 **:focus-visible:outline-accent" id="contact">
      {/* Everything is left-aligned at every size, so the eye runs down one
          edge: the pitch, the action that answers it, then the smaller stuff. */}
      <div className="mx-auto flex max-w-page flex-col gap-4 md:gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-5">
          {/* The pitch and its buttons stay together: the button is the reply
              to "Let's talk!", so it sits directly under it. */}
          <div className="flex flex-col items-start gap-1">
            <h2 className="font-display text-heading text-bg">Have an idea in mind? Let&rsquo;s talk!</h2>
            <p className="max-w-[36rem] text-bg/65">
              Commissions open for 3D props, backgrounds, and short-form animation.
            </p>

            <div className="mt-2 flex w-full flex-col gap-1.5 md:w-auto md:flex-row md:flex-wrap md:items-center">
              <Button variant="accent" href={`mailto:${EMAIL}`} className="max-md:py-2">
                Let&rsquo;s collaborate
              </Button>
              {/* On phones the orange button already opens the mail app, so the
                  address button would only repeat it. */}
              <Button variant="outline" onDark href={`mailto:${EMAIL}`} className="max-md:hidden">
                {EMAIL}
              </Button>
            </div>
          </div>

          {/* Socials are their own labelled group, kept apart from the main
              action so they read as "also find Lui here", not a rival CTA.
              A rule separates them on phones, where everything stacks. */}
          <div className="flex flex-col gap-1.5 border-t border-bg/10 pt-4 md:border-0 md:pt-0">
            <h3 id="footer-socials" className="font-mono text-small text-bg/65 uppercase">Find Lui on</h3>
            <ul className="flex gap-1.5" aria-labelledby="footer-socials">
              {SOCIALS.map((social) => (
                <li key={social.id}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${social.label} (opens in a new tab)`}
                    title={social.label}
                    className="flex size-6 items-center justify-center rounded-full border border-bg/25 text-bg transition-colors hover:border-accent hover:bg-accent hover:text-ink"
                  >
                    <SocialIcon id={social.id} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-bg/10 pt-2.5 font-mono text-small text-bg/65 uppercase md:flex-row md:flex-wrap md:justify-between md:gap-1.5">
          <span>All artwork &copy; Luinsomniac. Do not reproduce without permission.</span>
          <span>WEBSITE BUILT BY <a className="text-bg underline-offset-2 hover:underline" href="https://github.com/JReshley" target="_blank" rel="noopener noreferrer">JRESHLEY</a></span>
        </div>
      </div>
    </footer>
  )
}

// Line icons drawn in currentColor so they follow the link's hover colour.
function SocialIcon({ id }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {id === 'instagram' && (
        <>
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </>
      )}
      {id === 'linkedin' && (
        <>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </>
      )}
      {/* A stand-in V mark; swap in VGen's official logo if you have the SVG. */}
      {id === 'vgen' && (
        <>
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <path d="M7.5 7.5 12 17l4.5-9.5" />
        </>
      )}
    </svg>
  )
}
