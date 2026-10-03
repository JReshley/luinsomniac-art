import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import Home from './pages/Home.jsx'
import Museum from './pages/Museum.jsx'
import Showcase3D from './pages/Showcase3D.jsx'
import About from './pages/About.jsx'
import NotFound from './pages/NotFound.jsx'
import './styles.css'

// A route's `lazy` loader for a page module's default export.
const page = (load) => async () => ({ Component: (await load()).default })

// Admin sections whose screens come in phase 3 of the admin plan. Until then
// each shows its title and what it will do.
const adminStub = page(() => import('./admin/pages/AdminStub.jsx'))
const ADMIN_STUBS = [
  ['works', 'Works', 'Every artwork, 3D model and video, filtered by kind and status.'],
  ['works/new', 'New work', 'Pick a kind, fill in the details, and save it as a draft.'],
  ['works/:id', 'Edit work', 'The full editor for one work: details, media, status and notes.'],
  ['media', 'Media', 'Upload files, paste a Drive or YouTube link, and find files nothing uses.'],
  ['categories', 'Categories', 'Rename and reorder the filter chips on the Museum page.'],
  ['content', 'Site text', 'The headings and paragraphs on the public pages.'],
  ['links', 'Links', 'Social links and the contact email.'],
  ['brand', 'Brand', 'The logo, icon, portrait and display name.'],
  ['*', 'Not found', 'There’s no admin page at this address.'],
]

// A data router rather than <BrowserRouter>: only a data router honours the
// `viewTransition` prop on links, which drives the page-change wipe. The pages
// have to be declared here, not in a <Routes> inside App: links rendered under
// a nested <Routes> fall back to plain navigation and skip the wipe.
//
// basename keeps routes working when the site is served from a subfolder
// (GitHub Pages sets VITE_BASE_PATH, which Vite exposes as BASE_URL).
const router = createBrowserRouter(
  [
    {
      element: <App />,
      children: [
        { index: true, element: <Home /> },
        { path: 'museum', element: <Museum /> },
        { path: 'showcase', element: <Showcase3D /> },
        { path: 'about', element: <About /> },
        { path: '*', element: <NotFound /> },
      ],
    },

    // The admin sits outside <App>, so it gets none of the public header,
    // footer or page wipes. Its code is only downloaded when someone opens
    // /admin, so visitors to the public site never load it.
    {
      path: 'admin',
      lazy: page(() => import('./admin/AdminRoot.jsx')),
      HydrateFallback: () => null,
      children: [
        { path: 'login', lazy: page(() => import('./admin/pages/Login.jsx')), handle: { title: 'Sign in' } },
        { path: 'reset-password', lazy: page(() => import('./admin/pages/ResetPassword.jsx')), handle: { title: 'Reset password' } },
        {
          // Everything in here needs a signed-in admin (AdminLayout checks).
          lazy: page(() => import('./admin/AdminLayout.jsx')),
          children: [
            { index: true, lazy: page(() => import('./admin/pages/Dashboard.jsx')), handle: { title: 'Dashboard' } },
            ...ADMIN_STUBS.map(([path, title, note]) => ({ path, lazy: adminStub, handle: { title, note } })),
          ],
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL }
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
