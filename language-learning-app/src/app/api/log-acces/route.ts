import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { language_code, button_id } = await request.json();
    
    // Ottieni l'utente corrente
    const cookieStore = cookies();
    const userEmail = (await cookieStore).get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    // Verifica che l'utente abbia effettivamente accesso a questo codice
    const { data: hasAccess, error: accessError } = await supabase
      .from('codici_sbloccati')
      .select('*')
      .eq('utente_mail', userEmail)
      .eq('language_code', language_code)
      .single();

    if (accessError || !hasAccess) {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }

    // Opzionale: registra l'accesso in una tabella di log
    // Puoi creare una tabella 'access_logs' per tracciare gli accessi
    /*
    const { error: logError } = await supabase
      .from('access_logs')
      .insert([{
        utente_mail: userEmail,
        language_code,
        button_id,
        accessed_at: new Date().toISOString()
      }]);

    if (logError) {
      console.error('Errore nel logging:', logError);
      // Non bloccare l'accesso per errori di logging
    }
    */

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Errore log access:', error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}