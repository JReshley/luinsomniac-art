import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribe } from './db.js'

// Loads data from the API for a component:
//
//   const { data, error, loading, reload } = useApi(() => listWorks({ kind }), [kind])
//
// It calls again when `deps` change, and whenever anything is saved (in this
// tab or another), so a list stays current after an edit elsewhere. While it
// reloads, the previous `data` stays on screen instead of flashing empty.
//
// In phase 6 the "anything saved" signal has to come from somewhere else
// (refetch after this tab's own saves, or on window focus). The hook's shape
// stays the same.
export function useApi(load, deps) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true })
  const latest = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps)

  const reload = useCallback(async () => {
    // Only the newest call may set state, so a slow earlier one can't land
    // after a faster later one and show stale results.
    const call = ++latest.current
    setState((prev) => ({ ...prev, loading: true }))
    try {
      const data = await run()
      if (call === latest.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (call === latest.current) setState((prev) => ({ data: prev.data, error, loading: false }))
    }
  }, [run])

  useEffect(() => {
    reload()
    const unsubscribe = subscribe(reload)
    return () => {
      // Ignore anything still in flight once the component has moved on.
      latest.current++
      unsubscribe()
    }
  }, [reload])

  return { ...state, reload }
}
