import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
// import { cookies } from 'next/headers';

// @ts-expect-error: descrizione post & get
export async function POST(request: Request) {
  const { email, password } = await request.json();

  const { data: user, error } = await supabase
    .from('utenti')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .single();

  console.log('User data:', user);
  console.log('Error:', error);

  if (error || !user) {
    return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 });
  }

  // Imposta un cookie per mantenere la sessione
  // NOTA: Questo è un approccio semplificato. In produzione usa JWT o sessioni più sicure
  const response = NextResponse.json({ success: true, user }, { status: 200 });
  
  response.cookies.set('user_email', email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 giorni
    path: '/'
  });

  return response;
}