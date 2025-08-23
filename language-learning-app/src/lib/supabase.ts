import { createClient } from '@supabase/supabase-js'

// Validazione delle variabili d'ambiente
const supabaseUrl = "https://yaxftvgvyuibgzrgejfm.supabase.co"; //process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlheGZ0dmd2eXVpYmd6cmdlamZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDc5NDAsImV4cCI6MjA2MjgyMzk0MH0.m1vbxGyNo3chH70U9YN1KSpY69rrUXgffmWLl9qfsmg"; //process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlheGZ0dmd2eXVpYmd6cmdlamZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzI0Nzk0MCwiZXhwIjoyMDYyODIzOTQwfQ.4cUnMWYQfDrdJYxkthevUgK7iimd4VqSM6L7cfXGGRE"//process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!;

// Debug: verifica che le variabili siano caricate
console.log('🔍 Debug Supabase Variables:')
console.log('URL:', supabaseUrl ? '✅ Presente' : '❌ Mancante')
console.log('ANON_KEY:', supabaseAnonKey ? '✅ Presente' : '❌ Mancante')
console.log('SERVICE_ROLE:', supabaseServiceRoleKey ? '✅ Presente' : '❌ Mancante')

// Controllo che le variabili essenziali siano presenti
if (!supabaseUrl) {
  throw new Error(
    '🚨 ERRORE: NEXT_PUBLIC_SUPABASE_URL non trovata!\n' +
    '📋 Verifica che il file .env.local contenga:\n' +
    '   NEXT_PUBLIC_SUPABASE_URL=https://yaxftvgvyuibgzrgejfm.supabase.co\n' +
    '📖 Il file deve essere nella ROOT del progetto'
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    '🚨 ERRORE: NEXT_PUBLIC_SUPABASE_ANON_KEY non trovata!\n' +
    '📋 Verifica che il file .env.local contenga:\n' +
    '   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...\n' +
    '📖 Controlla che non ci siano spazi o caratteri nascosti'
  )
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    '🚨 ERRORE: SUPABASE_ROLE_KEY non trovata!\n' +
    '📋 Verifica che il file .env.local contenga:\n' +
    '   SUPABASE_ROLE_KEY=https://yaxftvgvyuibgzrgejfm.supabase.co\n' +
    '📖 Il file deve essere nella ROOT del progetto'
  )
}

// Client per operazioni pubbliche (registrazione, login)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Client per operazioni server-side con service role
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

// Se supabaseAdmin è null, logga un warning
if (!supabaseAdmin) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY non presente - alcune API potrebbero non funzionare')
}

// Log di successo
console.log('🚀 Supabase Client inizializzato con successo!')

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