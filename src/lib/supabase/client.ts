import { createClient } from '@supabase/supabase-js'

/**
 * Client-side Supabase client (uses anon key, subject to RLS)
 * Lazy factory — never initialized at module load, so missing env vars during
 * Next.js static build / CI don't crash the process.
 */
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Server-side Supabase client (uses service role key, bypasses RLS)
 * NEVER expose this to the browser.
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })
}
