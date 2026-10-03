import PeekButton from './PeekButton.jsx'
import SocialIcon from './SocialIcon.jsx'
import { useSite } from './SiteContent.jsx'
import DisplayTitle from './DisplayTitle.jsx'
import { BUNNIES } from '../data/stickers.js'

export default function Footer() {
  const { email, contacts } = useSite()

  return (
    <footer className="bg-ink px-2 py-6 md:px-3 lg:px-5 lg:py-8 **:focus-visible:outline-accent" id="contact">
      {/* Centred on phones, where everything stacks into one column. From md up
          it's left-aligned, so the eye runs down one edge: the pitch, the action
          that answers it, then the smaller stuff. */}
      <div className="mx-auto flex max-w-page flex-col gap-4 md:gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-5">
          {/* The pitch and its button stay together: the button is the reply
              to "Let's talk!", so it sits directly under it. */}
          <div className="flex flex-col items-center gap-1 text-center md:items-start md:text-left">
            <DisplayTitle as="h2" text="Have an idea in mind? Let’s talk!" className="font-display text-heading text-bg" />

            {/* The cool bunny peeks over the top edge, somewhere new each
                time, checking who wants to collaborate. */}
            <PeekButton
              sticker={BUNNIES.cool}
              align="random"
              show={0.7}
              size="5rem"
              wrapperClassName="mt-2 flex w-full md:w-auto"
              variant="accent"
              href={`mailto:${email}`}
              className="w-full max-md:py-2 md:w-auto"
            >
              Let&rsquo;s collaborate
            </PeekButton>
          </div>

          {/* Email and socials are their own labelled group, kept apart from
              the main action so they read as "other ways to reach Lui", not a
              rival CTA. The address shows as a tooltip on the mail icon. A rule
              separates them on phones, where everything stacks. */}
          <div className="flex flex-col items-center gap-1.5 border-t border-bg/10 pt-4 md:items-start md:border-0 md:pt-0">
            <h3 id="footer-contact" className="font-mono text-small text-bg/65 uppercase">Contact</h3>
            <ul className="flex gap-1.5" aria-labelledby="footer-contact">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <a
                    href={contact.href}
                    {...(contact.external && { target: '_blank', rel: 'noopener noreferrer' })}
                    aria-label={contact.external ? `${contact.label} (opens in a new tab)` : `Email ${contact.label}`}
                    title={contact.label}
                    className="flex size-6 items-center justify-center rounded-full border border-bg/25 text-bg transition-colors hover:border-accent hover:bg-accent hover:text-ink motion-safe:hover:animate-boing"
                  >
                    <SocialIcon id={contact.id} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-bg/10 pt-2.5 text-center font-mono text-small text-bg/65 uppercase md:flex-row md:text-left md:flex-wrap md:justify-between md:gap-1.5">
          <span>All artwork &copy; Luinsomniac. Do not reproduce without permission.</span>
          <span>WEBSITE BUILT BY <a className="text-bg underline-offset-2 hover:underline" href="https://github.com/JReshley" target="_blank" rel="noopener noreferrer">JRESHLEY</a></span>
        </div>
      </div>
    </footer>
  )
}
