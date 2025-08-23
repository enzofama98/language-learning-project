import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';
import { z } from 'zod';

// Schema di validazione
const logAccessSchema = z.object({
  language_code: z.string().min(1).max(20),
  button_id: z.string().min(1),
  action: z.enum(['view', 'access', 'complete']).optional().default('access')
});


export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      
      // Validazione rigorosa dei dati
      const validationResult = logAccessSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json({ 
          error: 'Dati della richiesta non validi',
          details: validationResult.error.errors
        }, { status: 400 });
      }

      const { language_code, button_id, action } = validationResult.data;
      const sanitizedCode = language_code.trim().toUpperCase();

      // 1. Verifica che l'utente abbia effettivamente accesso a questo codice
      const { data: hasAccess, error: accessError } = await supabaseAdmin
        .from('codici_sbloccati')
        .select('id, language_code, unlocked_at')
        .eq('user_id', user.id)
        .eq('language_code', sanitizedCode)
        .single();

      if (accessError || !hasAccess) {
        console.warn(`Tentativo accesso non autorizzato: utente ${user.email} -> codice ${sanitizedCode}`);
        return NextResponse.json({ 
          error: 'Accesso non autorizzato al contenuto richiesto' 
        }, { status: 403 });
      }

      // 2. Verifica che il corso esista ed sia attivo
      const { data: courseData, error: courseError } = await supabaseAdmin
        .from('anagrafica_codici')
        .select('id, codice, nome, active')
        .eq('codice', sanitizedCode)
        .eq('active', true)
        .single();

      if (courseError || !courseData) {
        return NextResponse.json({ 
          error: 'Corso non più disponibile' 
        }, { status: 404 });
      }

      // 3. Registra l'accesso nella tabella di log (opzionale ma raccomandato)
      const accessLogData = {
        user_id: user.id,
        user_email: user.email,
        language_code: sanitizedCode,
        course_name: courseData.nome,
        button_id,
        action,
        ip_address: req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        accessed_at: new Date().toISOString()
      };

      // Inserisci nel log degli accessi (crea questa tabella se non esiste)
      const { error: logError } = await supabaseAdmin
        .from('access_logs')
        .insert([accessLogData]);

      if (logError) {
        console.error('Errore nel logging accesso:', logError);
        // Non bloccare l'accesso per errori di logging, ma logga l'errore
      }

      // 4. Aggiorna statistiche di utilizzo (opzionale)
      const { error: statsError } = await supabaseAdmin
        .from('codici_sbloccati')
        .update({ 
          last_accessed_at: new Date().toISOString(),
          // Incrementa contatore accessi se esiste la colonna
          // access_count: supabaseAdmin.sql`access_count + 1`
        })
        .eq('id', hasAccess.id);

      if (statsError) {
        console.error('Errore aggiornamento statistiche:', statsError);
        // Non bloccare l'accesso per errori di statistiche
      }

      // 5. Log per monitoraggio amministratori
      console.log(`✅ Accesso autorizzato: ${user.email} -> ${courseData.nome} (${sanitizedCode})`);

      return NextResponse.json({ 
        success: true,
        message: 'Accesso autorizzato',
        course: {
          code: sanitizedCode,
          name: courseData.nome,
          accessed_at: accessLogData.accessed_at
        }
      });

    } catch (error) {
      console.error('Errore log-access:', error);
      return NextResponse.json({ 
        error: 'Errore interno del server durante la verifica dell\'accesso' 
      }, { status: 500 });
    }
  });
}