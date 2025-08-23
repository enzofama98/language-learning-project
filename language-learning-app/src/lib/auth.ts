/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from './supabase'

// Utilità per validare JWT lato server
export async function getServerUser() {
  const supabase = createServerComponentClient({ cookies })
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    return user
  } catch (error) {
    console.error('Errore validazione utente:', error)
    return null
  }
}

// Middleware per proteggere API routes
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  try {
    // Estrai il token dall'header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token mancante' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Verifica il JWT con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Chiama l'handler con l'utente validato
    return await handler(request, user)
    
  } catch (error) {
    console.error('Errore middleware auth:', error)
    return NextResponse.json({ error: 'Errore autenticazione' }, { status: 500 })
  }
}

// Hook personalizzato per componenti client
export function useAuthGuard() {
  return {
    getAuthHeaders: () => {
      // In un'app reale, il token sarebbe in localStorage o context
      // Per semplicità, assumiamo che sia disponibile
      const token = localStorage.getItem('supabase_token')
      return token ? { 'Authorization': `Bearer ${token}` } : {}
    }
  }
}