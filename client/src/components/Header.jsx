import logoMark from '../assets/logo-mark.png'

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
    <header className="site-header">
      <a className="brand" href="/">
        <img className="brand__mark" src={logoMark} alt="" width="45" height="34" />
        <span className="brand__wordmark">
          <span className="brand__name">LUINSOMNIAC ART</span>
          <span className="brand__tagline">3D · 2D · ANIMATION</span>
        </span>
      </a>

      <nav className="site-nav" aria-label="Main">
        {NAV_LINKS.map((link) => {
          const isCurrent = link.id === current
          return (
            <a
              key={link.id}
              href={link.href}
              className={isCurrent ? 'site-nav__link is-current' : 'site-nav__link'}
              // aria-current is what tells a screen reader which page you are on.
              // The purple pill alone only says it to people who can see it.
              aria-current={isCurrent ? 'page' : undefined}
            >
              {link.label}
            </a>
          )
        })}

        <a className="btn btn--primary" href="#contact">Let&rsquo;s collaborate</a>
      </nav>
    </header>
  )
}
