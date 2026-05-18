import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service_role.
 * - Bypassa RLS completamente.
 * - SOLO usar en Server Actions y Route Handlers (server-side).
 * - NUNCA importar desde código cliente ('use client').
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('[admin] NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no definidas')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
