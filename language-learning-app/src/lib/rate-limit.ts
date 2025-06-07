import { NextRequest } from 'next/server';

interface RateLimitOptions {
  interval: number; // Intervallo in millisecondi
  uniqueTokenPerInterval: number; // Numero massimo di token unici per intervallo
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

// Mappa in memoria per il rate limiting
// In produzione, usa Redis o un database per applicazioni multi-istanza
const rateLimitMap = new Map<string, RateLimitState>();

export default function rateLimit(options: RateLimitOptions) {
  const { interval, uniqueTokenPerInterval } = options;

  return {
    check: async (request: NextRequest, limit: number, token?: string) => {
      // Crea un token unico basato su IP e opzionalmente un token personalizzato
      const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
      
      const identifier = token ? `${ip}:${token}` : ip;
      const now = Date.now();
      const resetTime = now + interval;

      // Pulisci le entry scadute periodicamente
      if (rateLimitMap.size > uniqueTokenPerInterval) {
        cleanupExpiredEntries(now);
      }

      // Ottieni o crea lo stato per questo identificatore
      let state = rateLimitMap.get(identifier);
      
      if (!state || now > state.resetTime) {
        // Reset o nuova entry
        state = {
          count: 1,
          resetTime
        };
        rateLimitMap.set(identifier, state);
        return; // Primo accesso nell'intervallo, permetti
      }

      // Incrementa il contatore
      state.count++;

      if (state.count > limit) {
        // Limite superato
        const retryAfter = Math.ceil((state.resetTime - now) / 1000);
        const error = new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
        (error as any).status = 429;
        (error as any).retryAfter = retryAfter;
        throw error;
      }

      // Aggiorna lo stato
      rateLimitMap.set(identifier, state);
    },

    // Utilità per ottenere info sul rate limit
    getInfo: (request: NextRequest, limit: number, token?: string) => {
      const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
      
      const identifier = token ? `${ip}:${token}` : ip;
      const state = rateLimitMap.get(identifier);
      const now = Date.now();

      if (!state || now > state.resetTime) {
        return {
          count: 0,
          remaining: limit,
          resetTime: now + interval
        };
      }

      return {
        count: state.count,
        remaining: Math.max(0, limit - state.count),
        resetTime: state.resetTime
      };
    }
  };
}

// Funzione di pulizia per rimuovere entry scadute
function cleanupExpiredEntries(now: number) {
  for (const [key, state] of rateLimitMap.entries()) {
    if (now > state.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Rate limiter specifici per diversi endpoint
export const authRateLimit = rateLimit({
  interval: 15 * 60 * 1000, // 15 minuti
  uniqueTokenPerInterval: 1000
});

export const apiRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minuto
  uniqueTokenPerInterval: 500
});

export const strictRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minuto
  uniqueTokenPerInterval: 100
});