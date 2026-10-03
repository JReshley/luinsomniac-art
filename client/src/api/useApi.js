import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribe } from './changes.js'

// Loads data from the API for a component:
//
//   const works = useApi(() => listWorks({ kind }), [kind])
//   works.data       the last good answer (undefined until the first arrives)
//   works.error      why the last call failed, or null
//   works.loading    a call is in flight
//   works.reload()   call again now
//   works.setData(f) change the shown data straight away, e.g. drop a row the
//                    admin just deleted, without waiting for the reload
//
// It calls again when `deps` change, and whenever anything is saved (changes.js:
// after every write, and when the tab regains focus), so a list stays current.
// While it reloads, the previous `data` stays on screen instead of flashing
// empty; a reload that fails keeps it too, with `error` set, so the screen can
// say the list may be out of date (see <RefreshStatus> in admin/ui.jsx).
//
// The public site passes a `key` too (publicData.js). Data loaded under a key
// is kept for the visit, so going back to a page shows it straight away while
// it's checked again quietly, and two calls for the same key at once share
// one request. prefetch() fills a key ahead of time.
export function useApi(load, deps, key) {
  const [state, setState] = useState(() => ({ data: remembered.get(key), error: null, loading: true }))
  const latest = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps)

  const reload = useCallback(async () => {
    // Only the newest call may set state, so a slow earlier one can't land
    // after a faster later one and show stale results.
    const call = ++latest.current
    setState((prev) => ({ ...prev, loading: true }))
    try {
      const data = await (key ? shared(key, run) : run())
      if (call === latest.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (call === latest.current) setState((prev) => ({ data: prev.data, error, loading: false }))
    }
  }, [run])

  // Shows a change at once. The reload the save itself started (http.js and
  // the mock notify after the write is done) still lands afterwards and
  // replaces this with what the server has, so the two can't drift apart.
  const setData = useCallback((update) => {
    setState((prev) => ({ ...prev, data: typeof update === 'function' ? update(prev.data) : update }))
  }, [])

  useEffect(() => {
    reload()
    const unsubscribe = subscribe(reload)
    return () => {
      // Ignore anything still in flight once the component has moved on.
      latest.current++
      unsubscribe()
    }
  }, [reload])

  return { ...state, reload, setData }
}

// The last answer for each key, and the request for it still in flight.
const remembered = new Map()
const inFlight = new Map()

function shared(key, load) {
  if (!inFlight.has(key)) {
    const request = load()
      .then((data) => {
        remembered.set(key, data)
        return data
      })
      .finally(() => inFlight.delete(key))
    inFlight.set(key, request)
  }
  return inFlight.get(key)
}

// Loads a key's data ahead of time, unless it's already here or on its way.
// A failure is ignored: the page that needs the data will try again.
export function prefetch(key, load) {
  if (!remembered.has(key)) shared(key, load).catch(() => {})
}
