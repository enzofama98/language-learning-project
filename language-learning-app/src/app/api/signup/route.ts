import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const { data: existing } = await supabase
    .from('utenti')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  console.log('Existing user:', existing);

  if (existing) {
    return NextResponse.json({ error: 'Email già registrata' }, { status: 400 });
  }

  const { error } = await supabase
    .from('utenti')
    .insert([{ email, password }]);

  console.log('Insert error:', error);

  if (error) {
    return NextResponse.json({ error: 'Errore durante la registrazione' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
