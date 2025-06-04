import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

  return NextResponse.json({ success: true, user }, { status: 200 });
}
