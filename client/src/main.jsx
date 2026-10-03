import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import Home from './pages/Home.jsx'
import Museum from './pages/Museum.jsx'
import Showcase3D from './pages/Showcase3D.jsx'
import About from './pages/About.jsx'
import NotFound from './pages/NotFound.jsx'
import './styles.css'

// A route's `lazy` loader for a page module's default export.
const page = (load) => async () => ({ Component: (await load()).default })

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
            { path: 'works', lazy: page(() => import('./admin/pages/Works.jsx')), handle: { title: 'Works' } },
            // 'new' is a fixed path, so it wins over the :id one below it.
            { path: 'works/new', lazy: page(() => import('./admin/pages/WorkEditor.jsx')), handle: { title: 'New work' } },
            { path: 'works/:id', lazy: page(() => import('./admin/pages/WorkEditor.jsx')), handle: { title: 'Edit work' } },
            { path: 'media', lazy: page(() => import('./admin/pages/Media.jsx')), handle: { title: 'Media' } },
            { path: 'categories', lazy: page(() => import('./admin/pages/Categories.jsx')), handle: { title: 'Categories' } },
            { path: 'settings', lazy: page(() => import('./admin/pages/SiteSettings.jsx')), handle: { title: 'Site settings' } },
            // The old addresses of the pages Site settings replaced, for bookmarks.
            { path: 'content', element: <Navigate to="/admin/settings" replace /> },
            { path: 'links', element: <Navigate to="/admin/settings" replace /> },
            { path: 'brand', element: <Navigate to="/admin/settings" replace /> },
            { path: '*', lazy: page(() => import('./admin/pages/AdminStub.jsx')), handle: { title: 'Not found', note: 'There’s no admin page at this address.' } },
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
