import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';
import { z } from 'zod';

// Schema di validazione
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password attuale richiesta'),
  newPassword: z.string()
    .min(8, 'La nuova password deve essere di almeno 8 caratteri')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La password deve contenere almeno una lettera minuscola, una maiuscola e un numero')
});


export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      
      // Validazione rigorosa dei dati
      const validationResult = changePasswordSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json({ 
          error: 'Dati della richiesta non validi',
          details: validationResult.error.errors
        }, { status: 400 });
      }

      const { currentPassword, newPassword } = validationResult.data;

      // Verifica la password attuale
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        return NextResponse.json({ 
          error: 'Password attuale non corretta' 
        }, { status: 400 });
      }

      // Aggiorna la password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Errore aggiornamento password:', updateError);
        return NextResponse.json({ 
          error: 'Errore durante l\'aggiornamento della password' 
        }, { status: 500 });
      }

      // Log del cambio password per sicurezza
      console.log(`Password cambiata per utente: ${user.email} alle ${new Date().toISOString()}`);

      return NextResponse.json({ 
        success: true,
        message: 'Password aggiornata con successo' 
      });

    } catch (error) {
      console.error('Errore cambio password:', error);
      return NextResponse.json({ 
        error: 'Errore interno del server' 
      }, { status: 500 });
    }
  });
}