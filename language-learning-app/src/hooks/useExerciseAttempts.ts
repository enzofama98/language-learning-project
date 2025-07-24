// src/hooks/useExerciseAttempts.ts

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ExerciseAttempt {
  attempt_number: number;
  user_answer: string;
  is_correct: boolean;
  attempted_at: string;
}

interface ExerciseAttemptsData {
  attempts: ExerciseAttempt[];
  attemptsUsed: number;
  attemptsRemaining: number;
  isCompleted: boolean;
  canAttempt: boolean;
  showSolution: boolean;
}

interface UseExerciseAttemptsReturn {
  attemptsData: ExerciseAttemptsData | null;
  loading: boolean;
  error: string | null;
  submitAttempt: (userAnswer: string, isCorrect: boolean) => Promise<any>;
  refreshAttempts: () => Promise<void>;
  resetError: () => void;
}

export function useExerciseAttempts(exerciseId: string | null): UseExerciseAttemptsReturn {
  const [attemptsData, setAttemptsData] = useState<ExerciseAttemptsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Funzione per ottenere l'header di autenticazione
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Nessuna sessione attiva');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  };

  // Funzione per caricare i tentativi esistenti
  const loadAttempts = async () => {
    if (!exerciseId) return;

    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/exercise-attempts?exerciseId=${exerciseId}`, {
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nel caricamento dei tentativi');
      }

      const data = await response.json();
      setAttemptsData(data);
      
      console.log('✅ Tentativi caricati:', data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMsg);
      console.error('Errore caricamento tentativi:', err);
    } finally {
      setLoading(false);
    }
  };

  // Funzione per inviare un nuovo tentativo
  const submitAttempt = async (userAnswer: string, isCorrect: boolean) => {
    if (!exerciseId) {
      throw new Error('Exercise ID non fornito');
    }

    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/exercise-attempts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          exerciseId,
          userAnswer,
          isCorrect
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'invio del tentativo');
      }

      const result = await response.json();
      
      console.log('✅ Tentativo inviato:', result);
      
      // Ricarica i dati aggiornati
      await loadAttempts();
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMsg);
      console.error('Errore invio tentativo:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funzione per ricaricare i tentativi
  const refreshAttempts = async () => {
    await loadAttempts();
  };

  // Funzione per resettare gli errori
  const resetError = () => {
    setError(null);
  };

  // Carica i tentativi quando cambia l'exerciseId
  useEffect(() => {
    if (exerciseId) {
      loadAttempts();
    } else {
      setAttemptsData(null);
    }
  }, [exerciseId]);

  return {
    attemptsData,
    loading,
    error,
    submitAttempt,
    refreshAttempts,
    resetError
  };
}