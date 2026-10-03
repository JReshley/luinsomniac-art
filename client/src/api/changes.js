// "Something was saved" notifications. useApi() listens, and re-runs its call
// when one arrives, so a list stays current after an edit made elsewhere on the
// page, or (with the mock) in another tab.

const listeners = new Set()

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notify() {
  listeners.forEach((listener) => listener())
}
