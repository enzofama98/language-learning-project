// src/app/api/exercise-attempts/route.ts - Versione corretta

import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Crea un client Supabase per l'autenticazione dalla richiesta
function createSupabaseFromRequest(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // Estrai il token dalla richiesta
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) return null;
  
  // Crea client con il token dell'utente
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

// =====================================================
// POST - Registra un tentativo per un esercizio
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const { 
      exerciseId, 
      userAnswer, 
      isCorrect 
    } = await request.json();

    // Validazione input
    if (!exerciseId || !userAnswer || typeof isCorrect !== 'boolean') {
      return NextResponse.json({ 
        error: 'Parametri richiesti: exerciseId, userAnswer, isCorrect' 
      }, { status: 400 });
    }

    // Verifica autenticazione
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Header Authorization mancante' 
      }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verifica il token con Supabase admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Errore autenticazione:', authError);
      return NextResponse.json({ 
        error: 'Non autenticato' 
      }, { status: 401 });
    }

    const userId = user.id;

    console.log('🔍 Debug - POST tentativi:', {
      userId,
      exerciseId,
      userAnswer: userAnswer.substring(0, 50) + '...',
      isCorrect
    });

    // Chiama la funzione PostgreSQL per registrare il tentativo
    const { data, error } = await supabaseAdmin
      .rpc('record_exercise_attempt', {
        p_user_id: userId,
        p_exercise_id: exerciseId,
        p_user_answer: userAnswer,
        p_is_correct: isCorrect
      });

    if (error) {
      console.error('Errore registrazione tentativo:', error);
      return NextResponse.json({ 
        error: 'Errore durante la registrazione del tentativo',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ Tentativo registrato:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('Errore API exercise-attempts POST:', error);
    return NextResponse.json({ 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

// =====================================================
// GET - Ottieni i tentativi per un esercizio
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');

    if (!exerciseId) {
      return NextResponse.json({ 
        error: 'Parametro exerciseId richiesto' 
      }, { status: 400 });
    }

    // Verifica autenticazione
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Header Authorization mancante' 
      }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verifica il token con Supabase admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Errore autenticazione GET:', authError);
      return NextResponse.json({ 
        error: 'Non autenticato' 
      }, { status: 401 });
    }

    const userId = user.id;

    console.log('🔍 Debug - GET tentativi:', {
      userId,
      exerciseId
    });

    // Chiama la funzione PostgreSQL per ottenere i tentativi
    const { data, error } = await supabaseAdmin
      .rpc('get_exercise_attempts', {
        p_user_id: userId,
        p_exercise_id: exerciseId
      });

    if (error) {
      console.error('Errore recupero tentativi:', error);
      return NextResponse.json({ 
        error: 'Errore durante il recupero dei tentativi',
        details: error.message 
      }, { status: 500 });
    }

    // Calcola statistiche sui tentativi
    const attempts = data || [];
    const attemptsUsed = attempts.length;
    const attemptsRemaining = Math.max(0, 3 - attemptsUsed);
    const isCompleted = attempts.some((attempt: any) => attempt.is_correct);
    const canAttempt = attemptsRemaining > 0 && !isCompleted;
    const showSolution = attemptsUsed >= 3 && !isCompleted;

    const result = {
      attempts,
      attemptsUsed,
      attemptsRemaining,
      isCompleted,
      canAttempt,
      showSolution
    };

    console.log('✅ Tentativi recuperati:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Errore API exercise-attempts GET:', error);
    return NextResponse.json({ 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}