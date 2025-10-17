import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import rateLimit from '@/lib/rate-limit';

// Rate limiting per prevenire abusi
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minuto
  uniqueTokenPerInterval: 500,
});


export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    try {
      await limiter.check(request, 10, 'VALIDATE_CODE'); // max 10 tentativi per minuto
    } catch {
      return NextResponse.json({ error: 'Troppi tentativi. Riprova tra qualche minuto.' }, { status: 429 });
    }

    const { code } = await request.json();

    // Validazione input
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Codice richiesto' }, { status: 400 });
    }

    // Sanitizzazione input
    const sanitizedCode = code.trim().toUpperCase();
    
    if (sanitizedCode.length < 3 || sanitizedCode.length > 20) {
      return NextResponse.json({ error: 'Codice non valido' }, { status: 400 });
    }

    // Verifica esistenza del codice
    const { data: codeData, error } = await supabaseAdmin
      .from('anagrafica_codici')
      .select('id, codice, nome, description, active')
      .eq('codice', sanitizedCode)
      .eq('active', true) // Solo codici attivi
      .single();

    if (error || !codeData) {
      // Log del tentativo fallito per sicurezza
      console.warn(`Tentativo codice non valido: ${sanitizedCode} da IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`);
      
      return NextResponse.json({ 
        error: 'Invalid Code' 
      }, { status: 404 });
    }

    // Opzionale: controlla se il codice ha un limite di utilizzi
    // const { count } = await supabaseAdmin
    //   .from('codici_sbloccati')
    //   .select('*', { count: 'exact', head: true })
    //   .eq('language_code', sanitizedCode);
    
    // if (count && count >= codeData.max_uses) {
    //   return NextResponse.json({ error: 'Codice già utilizzato troppe volte' }, { status: 400 });
    // }

    return NextResponse.json({ 
      valid: true, 
      code: codeData.codice,
      name: codeData.nome,
      description: codeData.description
    });

  } catch (error) {
    console.error('Errore validazione codice:', error);
    return NextResponse.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 });
  }
}