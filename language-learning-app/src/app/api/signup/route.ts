import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// @ts-expect-error
export async function POST(request: Request) {
  const { email, password, code } = await request.json();

  const { data: existing } = await supabase
    .from('utenti')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  console.log('Existing user:', existing);

  if (existing) {
    return NextResponse.json({ error: 'Email già registrata' }, { status: 400 });
  }

  // controllo codice eistente su anagrafica
  const { data: codice, error: error_codice } = await supabase
    .from('anagrafica_codici')
    .select('*')
    .eq('codice', code)
    .single();
  console.log('Codice:', codice, error_codice);

  if (!codice || error_codice) {
    return NextResponse.json({ error: 'Codice non presente in anagrafica' }, { status: 500 });
  }
  else
  {
    const { error } = await supabase
    .from('utenti')
    .insert([{ email, password }]);

    console.log('Insert error:', error);

    if (error) {
      return NextResponse.json({ error: 'Errore durante la registrazione' }, { status: 500 });
    }

    // inserimento tabella codici_sbloccati
    const { error: insertError } = await supabase
    .from('codici_sbloccati')
    .insert([
      {
        utente_mail: email,
        language_code: code,
      },
    ]);

    if (insertError) {
      console.error('Errore inserimento codice:', insertError.message);
      return NextResponse.json({ error: 'Errore durante il salvataggio del codice' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
