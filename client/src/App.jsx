import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Museum from './pages/Museum.jsx'
import Showcase3D from './pages/Showcase3D.jsx'
import About from './pages/About.jsx'
import NotFound from './pages/NotFound.jsx'

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

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/museum" element={<Museum />} />
        <Route path="/showcase" element={<Showcase3D />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

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
      window.scrollTo(0, 0)
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
