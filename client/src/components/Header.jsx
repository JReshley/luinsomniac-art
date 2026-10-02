import logoMark from '../assets/logo-mark.png'
import Button from './Button.jsx'

// The site header from the Figma wireframe (01 · Home, node 12:445). It is the
// same bar on every page, so the only thing that varies is which link is
// marked as the current one.
//
// There is no router in this project yet. These are plain anchors pointing at
// the paths the pages/ folder implies; swap the <a> for a <Link> the day a
// router goes in and nothing else here has to change.

const NAV_LINKS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'museum', label: 'Museum', href: '/museum' },
  { id: 'showcase', label: '3D Showcase', href: '/showcase' },
  { id: 'about', label: 'About', href: '/about' },
]

export default function Header({ current = 'home' }) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 bg-bg/92 px-2 py-2 backdrop-blur-sm md:px-3 lg:px-5">
      <a className="flex items-center gap-2 no-underline" href="/">
        <img className="block h-[34px] w-[45px] object-contain" src={logoMark} alt="" width="45" height="34" />
        <span className="flex flex-col">
          <span className="font-medium leading-[1.4] tracking-widest text-ink">LUINSOMNIAC ART</span>
          <span className="font-mono text-small text-ink/65">3D · 2D · ANIMATION</span>
        </span>
      </a>

      <nav className="flex flex-wrap items-center gap-1" aria-label="Main">
        {NAV_LINKS.map((link) => {
          const isCurrent = link.id === current
          return (
            <a
              key={link.id}
              href={link.href}
              className={`rounded-sm px-1.5 py-1 font-medium leading-[1.4] no-underline ${
                isCurrent ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-ink/5'
              }`}
              // aria-current is what tells a screen reader which page you are on.
              // The blue pill alone only says it to people who can see it.
              aria-current={isCurrent ? 'page' : undefined}
            >
              {link.label}
            </a>
          )
        })}

        <Button variant="accent" href="#contact">Let&rsquo;s collaborate</Button>
      </nav>
    </header>
  )
}
