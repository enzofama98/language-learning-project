"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Tipi TypeScript basati sulla struttura della tabella anagrafica_esercizi
interface Exercise {
  id: string;
  lezione: number;
  text: string;
  tipo_esercizio: string;
  descrizione: string;
  frase: string;
  opzionali: any; // JSON field
  tipo_validazione: string;
  soluzione: string;
  validazione: any; // JSON field
  created_at: string;
}

interface ExerciseProgress {
  id: string;
  user_id: string;
  exercise_id: string;
  completed: boolean;
  completed_at?: string;
}

interface User {
  id: string;
  email: string;
}

interface Lesson {
  lesson_number: number;
  exercises: Exercise[];
  completed_exercises: number;
  total_exercises: number;
}

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseCode = params?.courseCode as string;

  const [user, setUser] = useState<User | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseProgress, setExerciseProgress] = useState<
    Map<string, boolean>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string>("");
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    initializePage();
  }, [courseCode]);

  const initializePage = async () => {
    try {
      // Verifica autenticazione
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (authError || !session) {
        router.push("/");
        return;
      }

      setUser({
        id: session.user.id,
        email: session.user.email || "",
      });

      // Verifica accesso al corso
      const hasAccess = await checkCourseAccess(session.user.id, courseCode);
      if (!hasAccess) {
        setError("Non hai accesso a questo corso");
        return;
      }

      // Carica informazioni corso
      await loadCourseInfo();

      // Carica esercizi e progresso
      await loadExercisesAndProgress(session.user.id);
    } catch (err) {
      console.error("Errore inizializzazione:", err);
      setError("Errore durante il caricamento del corso");
    } finally {
      setLoading(false);
    }
  };

  const checkCourseAccess = async (
    userId: string,
    courseCode: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("codici_sbloccati")
        .select("id")
        .eq("user_id", userId)
        .eq("language_code", courseCode.toUpperCase())
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  };

  const loadCourseInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("anagrafica_codici")
        .select("nome")
        .eq("codice", courseCode.toUpperCase())
        .single();

      if (!error && data) {
        setCourseName(data.nome);
      }
    } catch (err) {
      console.error("Errore caricamento info corso:", err);
    }
  };

  const loadExercisesAndProgress = async (userId: string) => {
    try {
      // Carica esercizi
      const { data: exercises, error: exercisesError } = await supabase
        .from("anagrafica_esercizi")
        .select("*")
        .eq("language_code", courseCode.toUpperCase())
        .order("lezione, created_at");

      if (exercisesError) {
        throw exercisesError;
      }

      // Carica progresso utente
      const { data: progress, error: progressError } = await supabase
        .from("exercise_progress")
        .select("exercise_id, completed")
        .eq("user_id", userId);

      if (progressError) {
        console.warn("Errore caricamento progresso:", progressError);
      }

      // Crea mappa del progresso
      const progressMap = new Map<string, boolean>();
      progress?.forEach((p) => {
        progressMap.set(p.exercise_id, p.completed);
      });
      setExerciseProgress(progressMap);

      // Raggruppa esercizi per lezione
      const lessonGroups = new Map<number, Exercise[]>();
      exercises?.forEach((exercise) => {
        const lesson = exercise.lezione;
        if (!lessonGroups.has(lesson)) {
          lessonGroups.set(lesson, []);
        }
        lessonGroups.get(lesson)!.push(exercise);
      });

      // Converti in array di lezioni
      const lessonsArray: Lesson[] = Array.from(lessonGroups.entries())
        .sort(([a], [b]) => a - b)
        .map(([lessonNumber, exercises]) => {
          const completedCount = exercises.filter((ex) =>
            progressMap.get(ex.id)
          ).length;
          return {
            lesson_number: lessonNumber,
            exercises,
            completed_exercises: completedCount,
            total_exercises: exercises.length,
          };
        });

      setLessons(lessonsArray);
    } catch (err) {
      console.error("Errore caricamento esercizi:", err);
      setError("Errore nel caricamento degli esercizi");
    }
  };

  const getCurrentExercise = (): Exercise | null => {
    if (lessons.length === 0 || currentLessonIndex >= lessons.length)
      return null;
    const currentLesson = lessons[currentLessonIndex];
    if (currentExerciseIndex >= currentLesson.exercises.length) return null;
    return currentLesson.exercises[currentExerciseIndex];
  };

  const isCurrentExerciseCompleted = (): boolean => {
    const exercise = getCurrentExercise();
    return exercise ? exerciseProgress.get(exercise.id) || false : false;
  };

  const canMoveToNext = (): boolean => {
    return isCurrentExerciseCompleted() || (showResult && isCorrect);
  };

  const handleSubmitAnswer = async () => {
    const exercise = getCurrentExercise();
    if (!exercise || !user) return;

    // Validazione della risposta
    let correct = false;

    switch (exercise.tipo_validazione.toLowerCase()) {
      case "exact":
        correct =
          userAnswer.trim().toLowerCase() === exercise.soluzione.toLowerCase();
        break;
      case "contains":
        correct = userAnswer
          .toLowerCase()
          .includes(exercise.soluzione.toLowerCase());
        break;
      case "regex":
        try {
          const regex = new RegExp(exercise.soluzione, "i");
          correct = regex.test(userAnswer);
        } catch {
          correct =
            userAnswer.trim().toLowerCase() ===
            exercise.soluzione.toLowerCase();
        }
        break;
      default:
        correct =
          userAnswer.trim().toLowerCase() === exercise.soluzione.toLowerCase();
    }

    setIsCorrect(correct);
    setShowResult(true);

    // Se corretto, marca come completato
    if (correct) {
      await markExerciseCompleted(exercise.id);
    }
  };

  const markExerciseCompleted = async (exerciseId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("exercise_progress").upsert({
        user_id: user.id,
        exercise_id: exerciseId,
        completed: true,
        completed_at: new Date().toISOString(),
      });

      if (!error) {
        setExerciseProgress((prev) => new Map(prev.set(exerciseId, true)));
      }
    } catch (err) {
      console.error("Errore salvataggio progresso:", err);
    }
  };

  const goToNextExercise = () => {
    if (!canMoveToNext()) return;

    const currentLesson = lessons[currentLessonIndex];

    // Reset form
    setUserAnswer("");
    setShowResult(false);
    setIsCorrect(false);

    // Se ci sono altri esercizi nella lezione corrente
    if (currentExerciseIndex < currentLesson.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    }
    // Altrimenti vai alla prossima lezione
    else if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
      setCurrentExerciseIndex(0);
    }
  };

  const goToPreviousExercise = () => {
    // Reset form
    setUserAnswer("");
    setShowResult(false);
    setIsCorrect(false);

    // Se non siamo al primo esercizio della lezione
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
    }
    // Altrimenti vai alla lezione precedente (ultimo esercizio)
    else if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
      setCurrentExerciseIndex(
        lessons[currentLessonIndex - 1].exercises.length - 1
      );
    }
  };

  const isAtFirstExercise = (): boolean => {
    return currentLessonIndex === 0 && currentExerciseIndex === 0;
  };

  const isAtLastExercise = (): boolean => {
    if (lessons.length === 0) return true;
    const lastLessonIndex = lessons.length - 1;
    const lastExerciseIndex = lessons[lastLessonIndex].exercises.length - 1;
    return (
      currentLessonIndex === lastLessonIndex &&
      currentExerciseIndex === lastExerciseIndex
    );
  };

  const getCurrentProgress = (): { current: number; total: number } => {
    let total = 0;
    let current = 0;

    lessons.forEach((lesson, lessonIdx) => {
      lesson.exercises.forEach((exercise, exerciseIdx) => {
        total++;
        if (
          lessonIdx < currentLessonIndex ||
          (lessonIdx === currentLessonIndex &&
            exerciseIdx <= currentExerciseIndex)
        ) {
          current++;
        }
      });
    });

    return { current, total };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Caricamento corso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Errore</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  const currentExercise = getCurrentExercise();
  const progress = getCurrentProgress();
  const currentLesson = lessons[currentLessonIndex];

  if (!currentExercise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Corso Completato!
          </h2>
          <p className="text-gray-600 mb-4">
            Hai completato tutti gli esercizi di {courseName}
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
          >
            Torna ai Corsi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{courseName}</h1>
              <p className="text-sm text-gray-600">
                Lezione {currentLesson.lesson_number} - Esercizio{" "}
                {currentExerciseIndex + 1} di {currentLesson.exercises.length}
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors duration-200"
            >
              Esci dal Corso
            </button>
          </div>

          {/* Progress Bar */}
          <div className="pb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progresso Totale</span>
              <span>
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Exercise Status */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">
                Tipo: {currentExercise.tipo_esercizio}
              </span>
              {isCurrentExerciseCompleted() && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                  ✓ Completato
                </span>
              )}
            </div>
          </div>

          {/* Exercise Content */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {currentExercise.text}
            </h2>

            {currentExercise.descrizione && (
              <p className="text-gray-600 mb-4">
                {currentExercise.descrizione}
              </p>
            )}

            {currentExercise.frase && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <p className="text-blue-800 font-mono">
                  {currentExercise.frase}
                </p>
              </div>
            )}

            {/* Answer Input */}
            <div className="mb-6">
              <label
                htmlFor="answer"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                La tua risposta:
              </label>
              <textarea
                id="answer"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Scrivi qui la tua risposta..."
                disabled={showResult && isCorrect}
              />
            </div>

            {/* Submit Button */}
            {!showResult && (
              <button
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md transition-colors duration-200"
              >
                Verifica Risposta
              </button>
            )}

            {/* Result */}
            {showResult && (
              <div
                className={`p-4 rounded-md mb-6 ${
                  isCorrect
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect ? (
                    <span className="text-green-600 text-xl">✓</span>
                  ) : (
                    <span className="text-red-600 text-xl">✗</span>
                  )}
                  <span
                    className={`font-medium ${
                      isCorrect ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {isCorrect ? "Risposta Corretta!" : "Risposta Incorretta"}
                  </span>
                </div>

                {!isCorrect && (
                  <div>
                    <p className="text-red-700 text-sm mb-2">
                      Risposta corretta:
                    </p>
                    <p className="text-red-800 font-mono bg-red-100 p-2 rounded">
                      {currentExercise.soluzione}
                    </p>
                  </div>
                )}

                {!isCorrect && (
                  <button
                    onClick={() => {
                      setShowResult(false);
                      setUserAnswer("");
                    }}
                    className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Riprova
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t">
            <button
              onClick={goToPreviousExercise}
              disabled={isAtFirstExercise()}
              className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md transition-colors duration-200"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Precedente
            </button>

            <div className="text-center">
              <div className="text-sm text-gray-500">
                Lezione {currentLesson.lesson_number}
              </div>
              <div className="text-xs text-gray-400">
                {currentLesson.completed_exercises}/
                {currentLesson.total_exercises} completati
              </div>
            </div>

            <button
              onClick={goToNextExercise}
              disabled={!canMoveToNext() || isAtLastExercise()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md transition-colors duration-200"
            >
              Successivo
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
