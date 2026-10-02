import { useEffect, useState } from 'react'
import { listSightings, createSighting, deleteSighting } from './api'
import DemoNotice from './components/DemoNotice.jsx'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'

// A deliberately small working app. Replace all of it with your own project.
//
// What is worth keeping is the SHAPE: four states rather than two, a loading
// message that admits a free-tier server can be slow to wake, and errors that
// say something rather than rendering an empty list.

const EMPTY_FORM = { place: '', description: '', spookiness: 3 }

export default function App() {
  const [status, setStatus] = useState('loading')   // loading | ready | error
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [slow, setSlow] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    setStatus('loading')
    setError(null)

    // A free-tier API sleeps. If this is taking a while, say so rather than
    // spinning silently, which looks broken. See page 6.
    const timer = setTimeout(() => setSlow(true), 3000)
  }




  return (
    <>
      {/* First Tab stop: lets keyboard users jump past the nav. Hidden until focused. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-1 focus:left-1 focus:z-20 focus:rounded-sm focus:bg-surface focus:px-2 focus:py-1"
      >
        Skip to content
      </a>

      <Header current="home" />

      <Home/>

      <Footer />
    </>
  )
}
