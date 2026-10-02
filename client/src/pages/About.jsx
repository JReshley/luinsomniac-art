import Chip from '../components/Chip.jsx'
import Placeholder from '../components/Placeholder.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import SocialIcon from '../components/SocialIcon.jsx'
import { EMAIL, SOCIALS } from '../data/contact.js'

// The About page body from the Figma wireframe (04 · About, node 23:1685):
// a portrait and contact links on the left, the bio, experience timeline and
// software list on the right.
//
// Below md the portrait shrinks to a thumbnail with the contact icons beside
// it, so the bio starts on the first screen instead of under a tall photo.

const EXPERIENCE = [
  { years: '2025—now', role: 'Freelance 3D & 2D artist', detail: 'Props, backgrounds, commissioned animation' },
  { years: '2024—2025', role: 'President, multimedia arts org', detail: 'Ran events, branding and student productions' },
  { years: '2022—2026', role: 'BS Entertainment & Multimedia Computing', detail: 'Specialization in animation' },
]

const SOFTWARE = ['Blender', 'Photoshop', 'After Effects', 'Krita', 'Audition']

// Email first, then the profiles. Only the profiles open in a new tab.
const CONTACTS = [
  { id: 'email', label: EMAIL, href: `mailto:${EMAIL}` },
  ...SOCIALS.map((social) => ({ ...social, external: true })),
]

export default function About() {
  return (
    <main id="main" className="mx-auto flex max-w-5xl flex-col gap-3 px-2 pt-4 pb-7 md:gap-4 md:px-3 lg:px-5 lg:pt-6.5 lg:pb-9.5">
      <h1 className="font-display text-display text-primary">About</h1>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
        <aside className="flex items-center gap-2.5 md:w-[260px] md:shrink-0 md:flex-col md:items-stretch md:gap-2">
          <Placeholder label="Portrait photo" className="aspect-[3/4] w-[120px] shrink-0 rounded-lg md:w-full" />

          <div className="flex flex-col gap-1">
            <h2 id="about-contact" className="font-mono text-small text-ink/65 uppercase">Contact</h2>
            <ul className="flex flex-wrap gap-1" aria-labelledby="about-contact">
              {CONTACTS.map((contact) => (
                <li key={contact.id}>
                  <a
                    href={contact.href}
                    {...(contact.external && { target: '_blank', rel: 'noopener noreferrer' })}
                    aria-label={contact.external ? `${contact.label} (opens in a new tab)` : `Email ${contact.label}`}
                    title={contact.label}
                    className="flex size-5 items-center justify-center rounded-full border border-ink/20 text-ink transition-[color,background-color,border-color,transform] hover:border-accent hover:bg-accent motion-safe:hover:-translate-y-0.5"
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
          <p className="max-w-[40rem] text-lead">
            Multimedia artist specializing in 3D modeling, illustration and visual storytelling. I like the
            unglamorous middle of production — the pass where a prop stops looking like geometry and starts
            looking like something someone owns.
          </p>
          <p className="max-w-[40rem] text-ink/65">
            Most of my work sits between departments: modeling props that have to match a painted background,
            designing characters that have to survive being rigged, lighting shots that have to cut together.
            That range is deliberate — it means fewer handoffs and fewer surprises.
          </p>

          <section className="mt-4 flex flex-col gap-1.5 md:mt-3 md:gap-2">
            <SectionHeader title="Selected experience" />
            {/* The rows aren't links, so the hover is only a soft tint and an orange
                edge marking the row under the pointer, nothing that says "click". */}
            <ol className="border-t border-ink/10">
              {EXPERIENCE.map((entry) => (
                <li
                  key={entry.role}
                  className="group flex flex-col gap-0.5 border-b border-l-2 border-b-ink/10 border-l-transparent py-2 pl-1 transition-colors hover:border-l-accent hover:bg-ink/5 md:flex-row md:gap-2"
                >
                  <span className="shrink-0 font-mono text-small text-ink/65 uppercase transition-colors group-hover:text-ink md:w-[110px] md:pt-0.5">{entry.years}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{entry.role}</span>
                    <span className="text-caption text-ink/65">{entry.detail}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-4 flex flex-col gap-1.5 md:mt-3 md:gap-2">
            <SectionHeader title="Software" />
            <ul className="flex flex-wrap gap-1">
              {SOFTWARE.map((name) => (
                <li key={name}>
                  <Chip className="transition-colors hover:bg-primary/20">{name}</Chip>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  )
}
