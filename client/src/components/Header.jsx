import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import logoMark from '../assets/logo-mark.png'
import PeekButton from './PeekButton.jsx'
import { BUNNIES } from '../data/stickers.js'

// The site header from the Figma wireframe (01 · Home, node 12:445). It is the
// same bar on every page, so the only thing that varies is which link is
// marked as the current one. NavLink works that out from the URL.
//
// Below lg (phones and tablets) the links fold into a hamburger menu that
// drops down under the bar. From lg up they sit inline as before.

const NAV_LINKS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'museum', label: 'Museum', href: '/museum' },
  { id: 'showcase', label: '3D Showcase', href: '/showcase' },
  { id: 'about', label: 'About', href: '/about' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the menu whenever the page changes, including via Back/Forward.
  useEffect(() => setMenuOpen(false), [pathname])

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
    // Named so a page change wipes only the content below it (styles.css).
    <header className="sticky top-0 z-10 border-b border-ink/10 bg-bg/92 backdrop-blur-sm [view-transition-name:site-header]">
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 md:px-3 lg:px-5 lg:py-2">
        <Link className="group flex items-center gap-1.5 no-underline md:gap-2" to="/" viewTransition>
          <img className="block h-[34px] w-[45px] object-contain motion-safe:group-hover:animate-boing" src={logoMark} alt="" width="45" height="34" />
          <span className="flex flex-col">
            <span className="font-medium leading-[1.4] tracking-widest text-ink">LUINSOMNIAC ART</span>
            <span className="font-mono text-small text-ink/65">3D · 2D · ANIMATION</span>
          </span>
        </Link>

        {/* Desktop: links inline. */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          <NavLinks />
          {/* The cool bunny hangs upside down from the bottom edge. */}
          <PeekButton
            sticker={BUNNIES.cool}
            side="bottom"
            align="random"
            show={0.7}
            size="4.5rem"
            wrapperClassName="flex"
            variant="accent"
            href="#contact"
          >
            Let&rsquo;s collaborate
          </PeekButton>
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
        <NavLinks onNavigate={closeMenu} stacked />
        <PeekButton
          sticker={BUNNIES.cool}
          side="bottom"
          align="random"
          show={0.7}
          size="4.5rem"
          wrapperClassName="mt-1.5 flex w-full"
          variant="accent"
          href="#contact"
          className="w-full py-2"
          onClick={closeMenu}
        >
          Let&rsquo;s collaborate
        </PeekButton>
      </nav>
    </header>
  )
}

function NavLinks({ onNavigate, stacked = false }) {
  return NAV_LINKS.map((link) => (
    // NavLink sets aria-current="page" on the active link, which is what tells
    // a screen reader which page you are on. The blue pill alone only says it
    // to people who can see it. `end` stops "/" matching every other page.
    <NavLink
      key={link.id}
      to={link.href}
      end
      viewTransition
      onClick={onNavigate}
      // Stacked links are full width and 48px tall: an easy thumb target.
      className={({ isActive }) =>
        `rounded-sm font-medium leading-[1.4] no-underline transition-[background-color,scale] ease-spring motion-safe:active:scale-95 ${stacked ? 'px-2 py-1.5 text-[1.125rem]' : 'px-1.5 py-1'} ${
          isActive ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-ink/5'
        }`
      }
    >
      {link.label}
    </NavLink>
  ))
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
