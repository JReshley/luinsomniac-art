import { createClient } from '@supabase/supabase-js'

// The one Supabase client, made the first time it's needed. It's only used for
// signing admins in and for sending an upload to the bucket. Everything else
// goes through the Express API.
//
// The URL and the anon key are PUBLIC: they ship in the built JavaScript, and
// that is what the anon key is for. What protects the data is that every table
// has row-level security with no policies (server/db/schema.sql), so this key
// can't read or write any of it. Never put the service role key here.

let client

export function getSupabase() {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Sign-in isn’t set up. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to client/.env.')
    }
    client = createClient(url, key)
  }
  return client
}
