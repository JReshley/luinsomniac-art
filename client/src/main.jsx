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
  ],
  { basename: import.meta.env.BASE_URL }
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
