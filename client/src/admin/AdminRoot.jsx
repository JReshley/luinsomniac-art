import { useEffect } from 'react'
import { Outlet, useMatches } from 'react-router-dom'

// The frame around every /admin page, signed in or not. It has none of the
// public site's header, footer or page wipes; it only keeps the admin out of
// search results and names the browser tab.
//
// Each admin route sets its tab name with `handle: { title }` in main.jsx.
export default function AdminRoot() {
  useNoIndex()

  const matches = useMatches()
  const title = matches.findLast((match) => match.handle?.title)?.handle.title

  useEffect(() => {
    document.title = `${title ?? 'Admin'} · Luinsomniac Admin`
  }, [title])

  return <Outlet />
}

// There is no public link to /admin, but a bookmark shared by mistake could
// still be crawled. The meta tag is added for the admin only and removed on the
// way back to the public site.
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.append(meta)
    return () => meta.remove()
  }, [])
}
