// Uploaded file contents for the mock, keyed by media id. They go in IndexedDB
// because localStorage holds about 5 MB in total, less than one .glb. Stands in
// for the Supabase Storage bucket until phase 6.

const DB_NAME = 'luinsomniac-admin-files'
const STORE = 'files'

let opening

function open() {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return opening
}

async function run(mode, action) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const putBlob = (id, blob) => run('readwrite', (store) => store.put(blob, id))
export const getBlob = (id) => run('readonly', (store) => store.get(id))
export const deleteBlob = (id) => run('readwrite', (store) => store.delete(id))
export const clearBlobs = () => run('readwrite', (store) => store.clear())
