import { useEffect, useState } from 'react'
import logoMark from '../assets/logo-mark.png'
import Button from './Button.jsx'

// The site header from the Figma wireframe (01 · Home, node 12:445). It is the
// same bar on every page, so the only thing that varies is which link is
// marked as the current one.
//
// There is no router in this project yet. These are plain anchors pointing at
// the paths the pages/ folder implies; swap the <a> for a <Link> the day a
// router goes in and nothing else here has to change.
//
// Below lg (phones and tablets) the links fold into a hamburger menu that
// drops down under the bar. From lg up they sit inline as before.

const NAV_LINKS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'museum', label: 'Museum', href: '/museum' },
  { id: 'showcase', label: '3D Showcase', href: '/showcase' },
  { id: 'about', label: 'About', href: '/about' },
]

export default function Header({ current = 'home' }) {
  const [menuOpen, setMenuOpen] = useState(false)

  // While the menu is open: Esc closes it, and widening the window past the
  // breakpoint closes it so it is not left open behind the inline nav.
  useEffect(() => {
    if (!menuOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const desktop = window.matchMedia('(min-width: 64rem)')
    function handleResize(event) {
      if (event.matches) setMenuOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    desktop.addEventListener('change', handleResize)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      desktop.removeEventListener('change', handleResize)
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-10 border-b border-ink/10 bg-bg/92 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 md:px-3 lg:px-5 lg:py-2">
        <a className="flex items-center gap-1.5 no-underline md:gap-2" href="/">
          <img className="block h-[34px] w-[45px] object-contain" src={logoMark} alt="" width="45" height="34" />
          <span className="flex flex-col">
            <span className="font-medium leading-[1.4] tracking-widest text-ink">LUINSOMNIAC ART</span>
            <span className="font-mono text-small text-ink/65">3D · 2D · ANIMATION</span>
          </span>
        </a>

        {/* Desktop: links inline. */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          <NavLinks current={current} />
          <Button variant="accent" href="#contact">Let&rsquo;s collaborate</Button>
        </nav>

        {/* Phones and tablets: the hamburger. */}
        <button
          type="button"
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-ink hover:bg-ink/5 lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <HamburgerIcon open={menuOpen} />
        </button>
      </div>

      {/* The dropdown panel. `hidden` (display: none) also takes the links out
          of the Tab order and the accessibility tree while the menu is shut. */}
      <nav
        id="mobile-menu"
        aria-label="Main"
        className={`${menuOpen ? 'flex' : 'hidden'} flex-col gap-1 border-t border-ink/10 px-2 pt-1.5 pb-3 md:px-3 lg:hidden`}
      >
        <NavLinks current={current} onNavigate={closeMenu} stacked />
        <Button variant="accent" href="#contact" className="mt-1.5 w-full py-2" onClick={closeMenu}>
          Let&rsquo;s collaborate
        </Button>
      </nav>
    </header>
  )
}

function NavLinks({ current, onNavigate, stacked = false }) {
  return NAV_LINKS.map((link) => {
    const isCurrent = link.id === current
    return (
      <a
        key={link.id}
        href={link.href}
        onClick={onNavigate}
        // Stacked links are full width and 48px tall: an easy thumb target.
        className={`rounded-sm font-medium leading-[1.4] no-underline ${stacked ? 'px-2 py-1.5 text-[1.125rem]' : 'px-1.5 py-1'} ${
          isCurrent ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-ink/5'
        }`}
        // aria-current is what tells a screen reader which page you are on.
        // The blue pill alone only says it to people who can see it.
        aria-current={isCurrent ? 'page' : undefined}
      >
        {link.label}
      </a>
    )
  })
}

// Three bars that turn into an ✕ when the menu is open.
function HamburgerIcon({ open }) {
  const bar = 'absolute left-0 h-0.25 w-full rounded-full bg-current transition-all duration-200 motion-reduce:transition-none'
  return (
    <span aria-hidden="true" className="relative block h-2 w-3">
      <span className={`${bar} top-0 ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
      <span className={`${bar} top-[7px] ${open ? 'opacity-0' : ''}`} />
      <span className={`${bar} bottom-0 ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
    </span>
  )
}
