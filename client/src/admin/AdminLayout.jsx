import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import logoMark from '../assets/logo-mark.png'
import { signOut, useAuthReady, useSession } from './auth.js'

// The signed-in admin: a sidebar of sections and the current page beside it.
// It is also the protected-route check. Every page under it needs a session,
// and without one you're sent to the login page, which brings you back here
// after signing in.
//
// From lg up the sidebar is always there. Below that it folds into a bar with a
// menu button, like the public header.

const SECTIONS = [
  { label: 'Dashboard', href: '/admin', end: true },
  { label: 'Works', href: '/admin/works' },
  { label: 'Media', href: '/admin/media' },
  { label: 'Categories', href: '/admin/categories' },
  { label: 'Site settings', href: '/admin/settings' },
]

export default function AdminLayout() {
  const session = useSession()
  const ready = useAuthReady()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the menu whenever the page changes, and on Esc.
  useEffect(() => setMenuOpen(false), [location.pathname])
  useEffect(() => {
    if (!menuOpen) return
    const handleKeyDown = (event) => event.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  // The stored session is still being checked (a reload, with real sign-in).
  // Sending an admin to the login page now would be wrong, then right back.
  if (!ready) return null

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[15rem_1fr]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-1 focus:left-1 focus:z-20 focus:rounded-sm focus:bg-surface focus:px-2 focus:py-1"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 z-10 border-b border-ink/10 bg-surface lg:h-svh lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <Link to="/admin" className="flex min-h-[2.75rem] items-center gap-2 no-underline">
              <img className="block h-[26px] w-[34px] object-contain" src={logoMark} alt="" width="34" height="26" />
              <span className="flex flex-col">
                <span className="text-caption font-medium tracking-widest text-ink">LUINSOMNIAC</span>
                <span className="font-mono text-small text-ink/65">ADMIN</span>
              </span>
            </Link>

            {/* Square, 48px, with a tooltip on hover and focus (icon-only). */}
            <span className="group relative lg:hidden">
              <button
                type="button"
                className="flex size-6 cursor-pointer items-center justify-center rounded-sm text-ink hover:bg-ink/5"
                aria-expanded={menuOpen}
                aria-controls="admin-nav"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MenuIcon open={menuOpen} />
              </button>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-full right-0 z-20 mt-0.5 hidden rounded-sm bg-ink px-1 py-0.5 text-caption whitespace-nowrap text-surface group-focus-within:block [@media(hover:hover)]:group-hover:block"
              >
                {menuOpen ? 'Close menu' : 'Open menu'}
              </span>
            </span>
          </div>

          <div id="admin-nav" className={`${menuOpen ? 'flex' : 'hidden'} flex-1 flex-col lg:flex`}>
            <nav aria-label="Admin" className="flex flex-col gap-0.5 px-1 py-1">
              {SECTIONS.map((section) => (
                <NavLink
                  key={section.href}
                  to={section.href}
                  end={section.end}
                  className={({ isActive }) =>
                    `flex min-h-[2.75rem] items-center rounded-sm px-1.5 font-medium leading-[1.4] no-underline transition-colors duration-150 ease-out ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-ink/5'
                    }`
                  }
                >
                  {section.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-1 border-t border-ink/10 px-2 py-2">
              <p className="text-caption text-ink/65">
                Signed in as <span className="font-medium text-ink">{session.name}</span>
                <span className="block truncate font-mono text-small">{session.email}</span>
              </p>
              <div className="flex items-center gap-2 text-caption">
                <a href={import.meta.env.BASE_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[2.75rem] items-center text-primary underline-offset-2 hover:underline">
                  View the site ↗
                </a>
                <button type="button" onClick={signOut} className="inline-flex min-h-[2.75rem] cursor-pointer items-center text-ink/65 underline-offset-2 hover:text-ink hover:underline">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main id="admin-main" className="min-w-0 px-2 py-3 md:px-3 lg:px-5 lg:py-4">
        <Outlet />
      </main>
    </div>
  )
}

function MenuIcon({ open }) {
  const bar = 'absolute left-0 h-0.25 w-full rounded-full bg-current'
  return (
    <span aria-hidden="true" className="relative block h-1.5 w-2.5">
      <span className={`${bar} top-0 ${open ? 'translate-y-[5px] rotate-45' : ''}`} />
      <span className={`${bar} top-[5px] ${open ? 'opacity-0' : ''}`} />
      <span className={`${bar} bottom-0 ${open ? '-translate-y-[5px] -rotate-45' : ''}`} />
    </span>
  )
}
