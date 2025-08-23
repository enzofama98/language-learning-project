import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

// Schema di validazione con Zod
const unlockCodeSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  code: z.string().min(3).max(20)
});


export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validazione rigorosa dei dati
    const validationResult = unlockCodeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Dati non validi',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const { userId, email, code } = validationResult.data;
    const sanitizedCode = code.trim().toUpperCase();

    // Verifica che il codice esista ancora e sia attivo
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('anagrafica_codici')
      .select('id, codice, nome')
      .eq('codice', sanitizedCode)
      .eq('active', true)
      .single();

    if (codeError || !codeData) {
      console.error('Codice non valido durante unlock:', codeError);
      return NextResponse.json({ 
        error: 'Codice non più valido' 
      }, { status: 400 });
    }

    // Verifica che l'utente non abbia già questo codice
    const { data: existingUnlock } = await supabaseAdmin
      .from('codici_sbloccati')
      .select('id')
      .eq('user_id', userId)
      .eq('language_code', sanitizedCode)
      .single();

    if (existingUnlock) {
      // Codice già sbloccato, non è un errore
      return NextResponse.json({ 
        success: true, 
        message: 'Codice già associato all\'account' 
      });
    }

    // Inserisci il nuovo sblocco con transazione atomica
    const { data: insertedUnlock, error: insertError } = await supabaseAdmin
      .from('codici_sbloccati')
      .insert([{
        user_id: userId,
        utente_mail: email, // Mantieni per compatibilità
        language_code: sanitizedCode,
        unlocked_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Errore inserimento sblocco:', insertError);
      return NextResponse.json({ 
        error: 'Errore durante l\'associazione del codice' 
      }, { status: 500 });
    }

    // Log dell'operazione per audit
    console.log(`Codice ${sanitizedCode} sbloccato per utente ${email} (${userId})`);

    return NextResponse.json({ 
      success: true,
      message: 'Codice associato con successo',
      unlock: {
        id: insertedUnlock.id,
        code: sanitizedCode,
        unlocked_at: insertedUnlock.unlocked_at
      }
    });

  } catch (error) {
    console.error('Errore unlock-code:', error);
    return NextResponse.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 });
  }
}