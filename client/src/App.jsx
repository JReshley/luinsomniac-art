import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'

// The frame around every page. The pages themselves are routes in main.jsx;
// <Outlet /> is where the current one renders.
export default function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-1 focus:left-1 focus:z-20 focus:rounded-sm focus:bg-surface focus:px-2 focus:py-1"
      >
        Skip to content
      </a>

      <ScrollToTop />
      <PageTitle />

      <Header />

      <Outlet />

      <Footer />
    </>
  )
}

// The browser only resets scroll on a full page load. A client-side route
// change keeps the old position, so a link clicked at the bottom of Home would
// land you at the bottom of Museum. This puts you at the top instead, or at
// the #section the link asked for.
function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
    } else {
      // 'instant' overrides the smooth scrolling in styles.css: a new page
      // should start at the top, not glide up from the old scroll position.
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [pathname, hash])

  return null
}

// index.html only sets one <title>, so without this every page shares it and
// browser tabs, history and screen readers can't tell the pages apart.
const SITE = 'Luinsomniac Art'
const PAGE_TITLES = {
  '/': SITE,
  '/museum': `The Museum · ${SITE}`,
  '/showcase': `3D Showcase · ${SITE}`,
  '/about': `About · ${SITE}`,
}

function PageTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    // The router treats "/museum/" as "/museum", so the lookup does too.
    const path = pathname.replace(/\/+$/, '') || '/'
    document.title = PAGE_TITLES[path] ?? `Page not found · ${SITE}`
  }, [pathname])

  return null
}
