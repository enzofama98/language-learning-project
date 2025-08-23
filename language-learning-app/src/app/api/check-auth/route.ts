import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// @ts-expect-error: descrizione post & get
export async function GET() {
  try {
    // Ottieni i cookies dalla richiesta
    const cookieStore = cookies();
    const userEmail = (await cookieStore).get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    // Qui potresti validare il token/sessione più approfonditamente
    // Per ora ritorniamo solo l'email dell'utente
    return NextResponse.json({ 
      user: { email: userEmail },
      authenticated: true 
    });

  } catch (error) {
    console.error('Errore check auth:', error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}