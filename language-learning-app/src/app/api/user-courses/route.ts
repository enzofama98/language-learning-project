import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // 1. Ottieni tutti i corsi disponibili nel sistema
      const { data: allCourses, error: coursesError } = await supabaseAdmin
        .from('anagrafica_codici')
        .select('id, codice, nome, description, active, created_at')
        .eq('active', true)
        .order('nome', { ascending: true });

      if (coursesError) {
        console.error('Errore caricamento corsi:', coursesError);
        return NextResponse.json({ 
          error: 'Errore nel caricamento dei corsi disponibili' 
        }, { status: 500 });
      }

      // 2. Ottieni i codici sbloccati per questo utente
      const { data: unlockedCodes, error: unlockedError } = await supabaseAdmin
        .from('codici_sbloccati')
        .select('language_code, unlocked_at, last_accessed_at, access_count')
        .eq('user_id', user.id);

      if (unlockedError) {
        console.error('Errore codici sbloccati:', unlockedError);
        return NextResponse.json({ 
          error: 'Errore nel caricamento dei permessi utente' 
        }, { status: 500 });
      }

      // 3. Crea un Map per controllo veloce dei codici sbloccati
      const unlockedMap = new Map(
        (unlockedCodes || []).map(item => [
          item.language_code, 
          {
            unlocked_at: item.unlocked_at,
            last_accessed_at: item.last_accessed_at,
            access_count: item.access_count || 0
          }
        ])
      );

      // 4. Combina i dati per creare la lista corsi
      const courses = (allCourses || []).map(course => {
        const unlocked = unlockedMap.get(course.codice);
        return {
          id: course.id,
          language_code: course.codice,
          nome: course.nome,
          description: course.description,
          enabled: !!unlocked,
          unlocked_at: unlocked?.unlocked_at || null,
          last_accessed_at: unlocked?.last_accessed_at || null,
          access_count: unlocked?.access_count || 0,
          created_at: course.created_at
        };
      });

      // 5. Ordina i corsi: prima quelli abilitati, poi per nome
      courses.sort((a, b) => {
        if (a.enabled && !b.enabled) return -1;
        if (!a.enabled && b.enabled) return 1;
        return a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' });
      });

      // 6. Statistiche
      const stats = {
        total: courses.length,
        enabled: courses.filter(c => c.enabled).length,
        disabled: courses.filter(c => !c.enabled).length,
        recently_accessed: courses.filter(c => 
          c.last_accessed_at && 
          new Date(c.last_accessed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
      };

      return NextResponse.json({ 
        courses,
        stats,
        user: {
          id: user.id,
          email: user.email
        }
      });

    } catch (error) {
      console.error('Errore generale user-courses:', error);
      return NextResponse.json({ 
        error: 'Errore interno del server' 
      }, { status: 500 });
    }
  });
}