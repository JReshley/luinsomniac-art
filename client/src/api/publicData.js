import { getSiteContent, listPublicCategories, listPublishedWorks } from './index.js'
import { prefetch, useApi } from './useApi.js'

// What the public pages read, each under its own key so useApi keeps it for
// the visit (see useApi.js). Every page reads through these, so the keys and
// the calls behind them can't drift apart.

const QUERIES = {
  site: () => getSiteContent(),
  featured: () => listPublishedWorks({ featured: true }),
  works: () => listPublishedWorks(),
  categories: () => listPublicCategories(),
  models: () => listPublishedWorks({ kind: 'model' }),
}

// usePublicData('works') → { data, error, loading, ... }, as useApi.
export const usePublicData = (name) => useApi(QUERIES[name], [name], name)

// Once the page in front of the visitor has what it needs, the other pages'
// data is fetched while the browser is idle, so following a link to the
// Museum or the 3D Showcase shows their works at once.
export function prefetchPublicData() {
  const start = () => Object.entries(QUERIES).forEach(([name, load]) => prefetch(name, load))
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(start, { timeout: 4000 })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(start, 2000)
  return () => clearTimeout(id)
}
