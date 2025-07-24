// src/components/ExerciseAttemptsUI.tsx

"use client";

import { useState } from 'react';
import { useExerciseAttempts } from '@/hooks/useExerciseAttempts';

interface Exercise {
  id: string;
  text: string;
  tipo_esercizio: string;
  descrizione?: string;
  soluzione: string;
  opzionali?: any;
}

interface ExerciseAttemptsUIProps {
  exercise: Exercise;
  selectedOptions: any[];
  onAnswerSubmit: (isCorrect: boolean) => void;
  onRetry: () => void;
  onNext: () => void;
  canMoveNext: boolean;
  validateAnswer: () => boolean;
  hasAnswerSelected: () => boolean;
}

export default function ExerciseAttemptsUI({
  exercise,
  selectedOptions,
  onAnswerSubmit,
  onRetry,
  onNext,
  canMoveNext,
  validateAnswer,
  hasAnswerSelected
}: ExerciseAttemptsUIProps) {
  const { 
    attemptsData, 
    loading, 
    error, 
    submitAttempt, 
    resetError 
  } = useExerciseAttempts(exercise.id);

  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    showResult: boolean;
  } | null>(null);

  // Funzione per costruire la risposta utente dai selectedOptions
  const getUserAnswer = () => {
    if (!selectedOptions || selectedOptions.length === 0) {
      return '';
    }

    // Normalizza il tipo di esercizio per gestire maiuscole/minuscole e spazi
    const exerciseType = exercise.tipo_esercizio.toLowerCase().trim();

    // Per diversi tipi di esercizio, costruisci la risposta in modo diverso
    switch (exerciseType) {
      case 'traduci':
        return selectedOptions
          .sort((a, b) => a.order - b.order)
          .map(opt => opt.value)
          .join(' ');
      
      case 'completa_frase':
      case 'completa la frase':
        return selectedOptions[0]?.value || '';
      
      case 'seleziona_che_state':
      case 'seleziona ciò che senti':
        return selectedOptions
          .sort((a, b) => a.order - b.order)
          .map(opt => opt.value)
          .join(' ');
      
      case 'seleziona_coppie':
      case 'seleziona le coppie':
        return JSON.stringify(selectedOptions);
      
      default:
        console.warn('Tipo esercizio non riconosciuto per getUserAnswer:', exercise.tipo_esercizio);
        return JSON.stringify(selectedOptions);
    }
  };

  // Gestisce l'invio della risposta
  const handleSubmitAnswer = async () => {
    if (submitting || !hasAnswerSelected()) return;

    setSubmitting(true);
    resetError();

    try {
      const isCorrect = validateAnswer();
      const userAnswer = getUserAnswer();

      // Invia il tentativo all'API
      const result = await submitAttempt(userAnswer, isCorrect);

      // Mostra il risultato
      setLastResult({
        isCorrect,
        showResult: true
      });

      // Notifica il componente padre
      onAnswerSubmit(isCorrect);

    } catch (err) {
      console.error('Errore durante l\'invio del tentativo:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Gestisce il retry
  const handleRetry = () => {
    setLastResult(null);
    onRetry();
  };

  // Se non ci sono dati sui tentativi ancora, mostra loading
  if (!attemptsData && loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Caricamento...</span>
      </div>
    );
  }

  const canAttempt = attemptsData?.canAttempt ?? true;
  const isCompleted = attemptsData?.isCompleted ?? false;
  const showSolution = attemptsData?.showSolution ?? false;
  const attemptsUsed = attemptsData?.attemptsUsed ?? 0;
  const attemptsRemaining = attemptsData?.attemptsRemaining ?? 3;

  return (
    <div className="space-y-4">
      {/* Indicatore tentativi */}
      {attemptsData && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Tentativi
            </h4>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {attemptsUsed}/3
            </span>
          </div>
          
          {/* Barra progresso tentativi */}
          <div className="flex space-x-1 mb-3">
            {[1, 2, 3].map((attemptNum) => {
              const attempt = attemptsData.attempts.find(a => a.attempt_number === attemptNum);
              let colorClass = 'bg-gray-200 dark:bg-gray-600'; // Non utilizzato
              
              if (attempt) {
                colorClass = attempt.is_correct 
                  ? 'bg-green-500' // Corretto
                  : 'bg-red-500';  // Sbagliato
              }

              return (
                <div
                  key={attemptNum}
                  className={`flex-1 h-2 rounded-full ${colorClass}`}
                  title={
                    attempt 
                      ? `Tentativo ${attemptNum}: ${attempt.is_correct ? 'Corretto' : 'Sbagliato'}`
                      : `Tentativo ${attemptNum}: Non utilizzato`
                  }
                />
              );
            })}
          </div>

          {/* Stato attuale */}
          <div className="text-sm">
            {isCompleted ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                ✅ Esercizio completato!
              </span>
            ) : canAttempt ? (
              <span className="text-blue-600 dark:text-blue-400">
                {attemptsRemaining} tentativ{attemptsRemaining === 1 ? 'o' : 'i'} rimanen{attemptsRemaining === 1 ? 'te' : 'ti'}
              </span>
            ) : showSolution ? (
              <span className="text-orange-600 dark:text-orange-400 font-medium">
                ⚠️ Tentativi esauriti - Soluzione mostrata
              </span>
            ) : (
              <span className="text-gray-600 dark:text-gray-400">
                Nessun tentativo disponibile
              </span>
            )}
          </div>
        </div>
      )}

      {/* Errore */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Risultato ultimo tentativo */}
      {lastResult?.showResult && (
        <div className={`rounded-lg p-4 border ${
          lastResult.isCorrect 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-start space-x-3">
            <div className={`text-2xl ${
              lastResult.isCorrect ? "text-green-600" : "text-red-600"
            }`}>
              {lastResult.isCorrect ? "✅" : "❌"}
            </div>
            <div>
              <p className={`font-medium ${
                lastResult.isCorrect 
                  ? "text-green-800 dark:text-green-200" 
                  : "text-red-800 dark:text-red-200"
              }`}>
                {lastResult.isCorrect ? "Corretto!" : "Non corretto"}
              </p>
              {!lastResult.isCorrect && showSolution && (
                <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                  <strong>Soluzione corretta:</strong> {exercise.soluzione}
                </p>
              )}
              {!lastResult.isCorrect && !showSolution && attemptsRemaining > 0 && (
                <p className="text-orange-700 dark:text-orange-300 text-sm mt-1">
                  Hai ancora {attemptsRemaining} tentativ{attemptsRemaining === 1 ? 'o' : 'i'}. Riprova!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottoni azione */}
      <div className="flex gap-3">
        {!lastResult?.showResult ? (
          // Prima della verifica
          <button
            onClick={handleSubmitAnswer}
            disabled={!hasAnswerSelected() || submitting || !canAttempt}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md flex items-center space-x-2"
          >
            {submitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>{submitting ? 'Verifica...' : 'Verifica'}</span>
          </button>
        ) : (
          // Dopo la verifica
          <div className="flex gap-3">
            {!lastResult.isCorrect && canAttempt && attemptsRemaining > 0 && (
              <button
                onClick={handleRetry}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md flex items-center space-x-2"
              >
                <span>🔄</span>
                <span>Riprova ({attemptsRemaining} tent. rimasti)</span>
              </button>
            )}

            {(lastResult.isCorrect || isCompleted || showSolution) && canMoveNext && (
              <button
                onClick={onNext}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md flex items-center space-x-2"
              >
                <span>Avanti</span>
                <span>→</span>
              </button>
            )}
          </div>
        )}

        {/* Pulsante sempre disponibile per esercizi già completati */}
        {isCompleted && !lastResult?.showResult && canMoveNext && (
          <button
            onClick={onNext}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md flex items-center space-x-2"
          >
            <span>✅ Già completato - Avanti</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* Storico tentativi (opzionale, per debug) */}
      {attemptsData?.attempts && attemptsData.attempts.length > 0 && process.env.NODE_ENV === 'development' && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            Mostra storico tentativi (Debug)
          </summary>
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border text-xs">
            {attemptsData.attempts.map((attempt, index) => (
              <div key={index} className="mb-2 last:mb-0">
                <strong>Tentativo {attempt.attempt_number}:</strong>{' '}
                <span className={attempt.is_correct ? 'text-green-600' : 'text-red-600'}>
                  {attempt.is_correct ? '✅' : '❌'}
                </span>{' '}
                {attempt.user_answer}
                <div className="text-gray-500 text-xs">
                  {new Date(attempt.attempted_at).toLocaleString('it-IT')}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}