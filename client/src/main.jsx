import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'

// A data router rather than <BrowserRouter>: only a data router honours the
// `viewTransition` prop on links, which drives the page-change wipe. One
// catch-all route hands every URL to App, whose <Routes> pick the page.
//
// basename keeps routes working when the site is served from a subfolder
// (GitHub Pages sets VITE_BASE_PATH, which Vite exposes as BASE_URL).
const router = createBrowserRouter([{ path: '*', element: <App /> }], {
  basename: import.meta.env.BASE_URL,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
