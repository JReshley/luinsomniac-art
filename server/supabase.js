import { createClient } from '@supabase/supabase-js'

// The two things the API needs from Supabase, behind small functions so the
// routes (and tests) don't depend on its client:
//
//   verifyToken(jwt)   who is signed in: { id, email } or null
//   storage            the file bucket: public URLs, signed uploads, removal
//
// SUPABASE_SERVICE_ROLE_KEY can do anything in the project, including skipping
// every row rule. It lives only in this server's environment, never in the
// client and never in git.

export function createSupabaseServices() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set. Copy server/.env.example to .env and fill them in.')
    process.exit(1)
  }

  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const bucket = process.env.SUPABASE_BUCKET || 'media'
  const files = client.storage.from(bucket)

  return {
    // Asks Supabase whether the token is a live session. A forged or expired
    // token comes back as an error, so null.
    async verifyToken(token) {
      const { data, error } = await client.auth.getUser(token)
      return error || !data.user ? null : { id: data.user.id, email: data.user.email }
    },

    storage: {
      bucket,
      // The bucket is public: uploaded files are the site's pictures, and their
      // paths contain a random id, so a draft's file can't be guessed.
      publicUrl: (path) => files.getPublicUrl(path).data.publicUrl,

      // A one-use link the browser uploads the file to directly.
      async signedUpload(path) {
        const { data, error } = await files.createSignedUploadUrl(path)
        if (error) throw error
        return { path: data.path, token: data.token }
      },

      async exists(path) {
        const slash = path.lastIndexOf('/')
        const { data, error } = await files.list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 })
        if (error) throw error
        return data.some((file) => file.name === path.slice(slash + 1))
      },

      async remove(path) {
        const { error } = await files.remove([path])
        if (error) throw error
      },
    },
  }
}
