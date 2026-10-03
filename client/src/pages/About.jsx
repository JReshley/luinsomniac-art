import Chip from '../components/Chip.jsx'
import Placeholder from '../components/Placeholder.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import SocialIcon from '../components/SocialIcon.jsx'
import { useSite } from '../components/SiteContent.jsx'
import DisplayTitle from '../components/DisplayTitle.jsx'
import SlapSticker from '../components/SlapSticker.jsx'
import { BUNNIES } from '../data/stickers.js'
import { imageProps } from '../lib/publicWork.js'

// The About page body from the Figma wireframe (04 · About, node 23:1685):
// a portrait and contact links on the left, the bio, experience timeline and
// software list on the right.
//
// Below md the portrait shrinks to a thumbnail with the contact icons beside
// it, so the bio starts on the first screen instead of under a tall photo.

// The bio, experience and software come from the admin (Site settings ->
// About page), with the site's own copy in data/siteText.js until then.

export default function About() {
  const site = useSite()
  const { contacts, portrait, experience, software } = site

  return (
    <main id="main" className="mx-auto flex max-w-5xl flex-col gap-3 px-2 pt-4 pb-7 md:gap-4 md:px-3 lg:px-5 lg:pt-6.5 lg:pb-9.5">
      <DisplayTitle text="About" entrance className="font-display text-display text-primary" />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
        <aside className="flex items-center gap-2.5 md:w-[260px] md:shrink-0 md:flex-col md:items-stretch md:gap-2">
          {/* "Violence is an option", slapped on the corner of the photo like
              a sticker on a laptop lid. */}
          <div className="relative w-[120px] shrink-0 md:w-full">
            {portrait ? (
              <img {...imageProps(portrait.url, '(min-width: 48rem) 260px, 120px')} alt={portrait.altText || 'Portrait of Lui'} className="aspect-[3/4] w-full rounded-lg object-cover" />
            ) : (
              <Placeholder label="Portrait photo" className="aspect-[3/4] w-full rounded-lg" />
            )}
            <SlapSticker
              sticker={BUNNIES.violence}
              tilt="9deg"
              className="absolute -right-2 -bottom-2 w-[3.75rem] md:-right-4 md:-bottom-1 md:w-[7rem]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <h2 id="about-contact" className="font-mono text-small text-ink/65 uppercase">Contact</h2>
            <ul className="flex flex-wrap gap-1" aria-labelledby="about-contact">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <a
                    href={contact.href}
                    {...(contact.external && { target: '_blank', rel: 'noopener noreferrer' })}
                    aria-label={contact.external ? `${contact.label} (opens in a new tab)` : `Email ${contact.label}`}
                    title={contact.label}
                    className="flex size-5 items-center justify-center rounded-full border border-ink/20 text-ink transition-colors hover:border-accent hover:bg-accent motion-safe:hover:animate-boing"
                  >
                    <SocialIcon id={contact.id} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Left-aligned, not justified: in a column this narrow, justify stretches
              the word gaps into visible rivers, worst on phones. */}
          <p className="max-w-[40rem] text-lead">{site.text('about.intro')}</p>
          <p className="max-w-[40rem] text-ink/65">{site.text('about.body')}</p>

          {experience.length > 0 && (
          <section className="mt-4 flex flex-col gap-1.5 md:mt-3 md:gap-2">
            <SectionHeader title="Experience Overview" />
            {/* The rows aren't links, so the hover is only a soft tint and an orange
                edge marking the row under the pointer, nothing that says "click". */}
            <ol className="border-t border-ink/10">
              {experience.map((entry) => (
                <li
                  key={entry.id}
                  className="group flex flex-col gap-0.5 border-b border-l-2 border-b-ink/10 border-l-transparent py-2 pl-1 transition-colors hover:border-l-accent hover:bg-ink/5 md:flex-row md:gap-2"
                >
                  <span className="shrink-0 font-mono text-small text-ink/65 uppercase transition-colors group-hover:text-ink md:w-[110px] md:pt-0.5">{entry.years}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{entry.role}</span>
                    {entry.detail && <span className="text-caption text-ink/65">{entry.detail}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
          )}

          {software.length > 0 && (
          <section className="mt-4 flex flex-col gap-1.5 md:mt-3 md:gap-2">
            <SectionHeader title="Software" />
            <ul className="flex flex-wrap gap-1">
              {software.map((name) => (
                <li key={name}>
                  <Chip className="transition-colors hover:bg-primary/20">{name}</Chip>
                </li>
              ))}
            </ul>
          </section>
          )}
        </div>
      </div>
    </main>
  )
}
