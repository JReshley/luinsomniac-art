import Button from './Button.jsx'
import SocialIcon from './SocialIcon.jsx'
import { EMAIL, SOCIALS } from '../data/contact.js'

export default function Footer() {
  return (
    <footer className="bg-ink px-2 py-6 md:px-3 lg:px-5 lg:py-8 **:focus-visible:outline-accent" id="contact">
      {/* Centred on phones, where everything stacks into one column. From md up
          it's left-aligned, so the eye runs down one edge: the pitch, the action
          that answers it, then the smaller stuff. */}
      <div className="mx-auto flex max-w-page flex-col gap-4 md:gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-5">
          {/* The pitch and its buttons stay together: the button is the reply
              to "Let's talk!", so it sits directly under it. */}
          <div className="flex flex-col items-center gap-1 text-center md:items-start md:text-left">
            <h2 className="font-display text-heading text-bg">Have an idea in mind? Let&rsquo;s talk!</h2>

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
              action so they read as "also find Luis here", not a rival CTA.
              A rule separates them on phones, where everything stacks. */}
          <div className="flex flex-col items-center gap-1.5 border-t border-bg/10 pt-4 md:items-start md:border-0 md:pt-0">
            <h3 id="footer-socials" className="font-mono text-small text-bg/65 uppercase">Find me on</h3>
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

        <div className="flex flex-col gap-1 border-t border-bg/10 pt-2.5 text-center font-mono text-small text-bg/65 uppercase md:flex-row md:text-left md:flex-wrap md:justify-between md:gap-1.5">
          <span>All artwork &copy; Luinsomniac. Do not reproduce without permission.</span>
          <span>WEBSITE BUILT BY <a className="text-bg underline-offset-2 hover:underline" href="https://github.com/JReshley" target="_blank" rel="noopener noreferrer">JRESHLEY</a></span>
        </div>
      </div>
    </footer>
  )
}
