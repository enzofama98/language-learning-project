import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client per operazioni pubbliche (registrazione, login)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client per operazioni server-side con service role
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
})

// Tipi TypeScript per i nostri dati
export interface UserProfile {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface CodeUnlocked {
  id: string
  user_id: string
  language_code: string
  unlocked_at: string
}

export interface CourseCode {
  id: string
  code: string
  name: string
  description?: string
  created_at: string
}