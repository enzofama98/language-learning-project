import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Ottieni l'utente corrente dai cookies
    const cookieStore = cookies();
    const userEmail = (await cookieStore).get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    // 1. Ottieni tutti i pulsanti/corsi disponibili nel sistema
    const { data: allCourses, error: coursesError } = await supabase
      .from('anagrafica_codici')
      .select('*');

    if (coursesError) {
      console.error('Errore caricamento corsi:', coursesError);
      return NextResponse.json({ error: 'Errore nel caricamento dei corsi' }, { status: 500 });
    }

    // 2. Ottieni i codici sbloccati per questo utente
    const { data: unlockedCodes, error: unlockedError } = await supabase
      .from('codici_sbloccati')
      .select('language_code')
      .eq('utente_mail', userEmail);

    if (unlockedError) {
      console.error('Errore codici sbloccati:', unlockedError);
      return NextResponse.json({ error: 'Errore nel caricamento dei permessi' }, { status: 500 });
    }

    // 3. Crea la lista dei codici sbloccati per confronto veloce
    const unlockedSet = new Set(unlockedCodes?.map(item => item.language_code) || []);

    // 4. Combina i dati per creare i pulsanti con stato enabled/disabled
    const buttons = allCourses?.map(course => ({
      id: course.id || course.codice, // usa id se disponibile, altrimenti codice
      label: course.nome || course.description || `Corso ${course.codice}`, // adatta ai nomi delle tue colonne
      language_code: course.codice,
      enabled: unlockedSet.has(course.codice)
    })) || [];

    // 5. Ordina i pulsanti: prima quelli abilitati, poi quelli disabilitati
    buttons.sort((a, b) => {
      if (a.enabled && !b.enabled) return -1;
      if (!a.enabled && b.enabled) return 1;
      return a.label.localeCompare(b.label);
    });

    return NextResponse.json({ 
      buttons,
      total: buttons.length,
      enabled: buttons.filter(b => b.enabled).length
    });

  } catch (error) {
    console.error('Errore generale user-buttons:', error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}