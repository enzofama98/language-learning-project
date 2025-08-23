import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

// @ts-expect-error: descrizione post & get
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // 1. Ottieni tutti i corsi disponibili nel sistema
      const { data: allCourses, error: coursesError } = await supabaseAdmin
        .from('anagrafica_codici')
        .select('id, codice, nome, description, active, created_at')
        .eq('active', true) // Solo corsi attivi
        .order('nome', { ascending: true });

      if (coursesError) {
        console.error('Errore caricamento corsi:', coursesError);
        return NextResponse.json({ 
          error: 'Errore nel caricamento dei corsi disponibili' 
        }, { status: 500 });
      }

      // 2. Ottieni i codici sbloccati per questo utente specifico
      const { data: unlockedCodes, error: unlockedError } = await supabaseAdmin
        .from('codici_sbloccati')
        .select('language_code, unlocked_at')
        .eq('user_id', user.id);

      if (unlockedError) {
        console.error('Errore codici sbloccati:', unlockedError);
        return NextResponse.json({ 
          error: 'Errore nel caricamento dei permessi utente' 
        }, { status: 500 });
      }

      // 3. Crea un Set per controllo veloce dei codici sbloccati
      const unlockedSet = new Set(
        unlockedCodes?.map(item => item.language_code) || []
      );

      // 4. Combina i dati per creare i pulsanti con stato enabled/disabled
      const buttons = (allCourses || []).map(course => ({
        id: course.id || course.codice,
        label: course.nome || `Corso ${course.codice}`,
        description: course.description || undefined,
        language_code: course.codice,
        enabled: unlockedSet.has(course.codice),
        created_at: course.created_at
      }));

      // 5. Ordina i pulsanti: prima quelli abilitati, poi per nome
      buttons.sort((a, b) => {
        // Prima quelli abilitati
        if (a.enabled && !b.enabled) return -1;
        if (!a.enabled && b.enabled) return 1;
        
        // Poi per nome alfabetico
        return a.label.localeCompare(b.label, 'it', { 
          sensitivity: 'base' 
        });
      });

      // 6. Statistiche per la UI
      const stats = {
        total: buttons.length,
        enabled: buttons.filter(b => b.enabled).length,
        disabled: buttons.filter(b => !b.enabled).length
      };

      // 7. Log per audit (opzionale)
      console.log(`Utente ${user.email} ha caricato ${stats.enabled}/${stats.total} corsi`);

      return NextResponse.json({ 
        buttons,
        stats,
        user: {
          id: user.id,
          email: user.email
        }
      });

    } catch (error) {
      console.error('Errore generale user-buttons:', error);
      return NextResponse.json({ 
        error: 'Errore interno del server' 
      }, { status: 500 });
    }
  });
}