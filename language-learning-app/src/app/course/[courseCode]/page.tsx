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

interface SelectedOption {
  value: string;
  order: number;
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

  // Stati per le diverse tipologie di esercizi
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    initializePage();
  }, [courseCode]);

  useEffect(() => {
    // Reset quando cambia esercizio
    setSelectedOptions([]);
    setShowResult(false);
    setIsCorrect(false);
    setIsPlaying(false);
  }, [currentLessonIndex, currentExerciseIndex]);

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

  const handleOptionClick = (option: string) => {
    if (showResult) return;

    const existingIndex = selectedOptions.findIndex(
      (opt) => opt.value === option
    );

    if (existingIndex !== -1) {
      // Rimuovi se già selezionato
      const newSelected = selectedOptions.filter((opt) => opt.value !== option);
      // Ricalcola gli ordini
      const reorderedSelected = newSelected.map((opt, index) => ({
        ...opt,
        order: index + 1,
      }));
      setSelectedOptions(reorderedSelected);
    } else {
      // Aggiungi alla fine
      const newOrder = selectedOptions.length + 1;
      setSelectedOptions([
        ...selectedOptions,
        { value: option, order: newOrder },
      ]);
    }
  };

  const handleSubmitAnswer = async () => {
    const exercise = getCurrentExercise();
    if (!exercise || !user) return;

    let correct = false;

    switch (exercise.tipo_esercizio.toLowerCase()) {
      case "traduci":
        correct = validateTraduci(exercise);
        break;
      case "completa la frase":
        correct = validateCompletaFrase(exercise);
        break;
      case "seleziona ciò che senti":
        correct = validateSelezionaCheState(exercise);
        break;
      case "seleziona le coppie":
        correct = validateSelezionaCoppie(exercise);
        break;
      default:
        correct = false;
    }

    setIsCorrect(correct);
    setShowResult(true);

    // Se corretto, marca come completato
    if (correct) {
      await markExerciseCompleted(exercise.id);
    }
  };

  const validateTraduci = (exercise: Exercise): boolean => {
    const userAnswer = selectedOptions
      .sort((a, b) => a.order - b.order)
      .map((opt) => opt.value)
      .join(" ");

    return userAnswer.toLowerCase() === exercise.soluzione.toLowerCase();
  };

  const validateCompletaFrase = (exercise: Exercise): boolean => {
    return (
      selectedOptions.length === 1 &&
      selectedOptions[0].value.toLowerCase() ===
        exercise.soluzione.toLowerCase()
    );
  };

  const validateSelezionaCheState = (exercise: Exercise): boolean => {
    const userAnswer = selectedOptions
      .sort((a, b) => a.order - b.order)
      .map((opt) => opt.value)
      .join(" ");

    return userAnswer.toLowerCase() === exercise.soluzione.toLowerCase();
  };

  const validateSelezionaCoppie = (exercise: Exercise): boolean => {
    try {
      const correctPairs = JSON.parse(exercise.soluzione);
      const userPairs: { [key: string]: string } = {};

      // Assumi che le opzioni selezionate siano in coppie (inglese, italiano)
      for (let i = 0; i < selectedOptions.length; i += 2) {
        if (i + 1 < selectedOptions.length) {
          const first = selectedOptions.find(
            (opt) => opt.order === i + 1
          )?.value;
          const second = selectedOptions.find(
            (opt) => opt.order === i + 2
          )?.value;
          if (first && second) {
            userPairs[first] = second;
          }
        }
      }

      return JSON.stringify(userPairs) === JSON.stringify(correctPairs);
    } catch {
      return false;
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

    if (currentExerciseIndex < currentLesson.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
      setCurrentExerciseIndex(0);
    }
  };

  const goToPreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
    } else if (currentLessonIndex > 0) {
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

  const renderExerciseContent = () => {
    const exercise = getCurrentExercise();
    if (!exercise) return null;

    const exerciseData = exercise.opzionali || {};

    switch (exercise.tipo_esercizio.toLowerCase()) {
      case "traduci":
        return renderTraduciExercise(exercise, exerciseData);
      case "completa la frase":
        return renderCompletaFraseExercise(exercise, exerciseData);
      case "seleziona ciò che senti":
        return renderSelezionaCheStateExercise(exercise, exerciseData);
      case "seleziona le coppie":
        return renderSelezionaCoppieExercise(exercise, exerciseData);
      default:
        return (
          <div className="text-red-500">Tipo di esercizio non supportato</div>
        );
    }
  };

  const renderTraduciExercise = (exercise: Exercise, data: any) => {
    const bancaParole = data.banca_parole || [];

    return (
      <div>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="text-blue-800 font-medium">Frase da tradurre:</p>
          <p className="text-blue-900 text-lg font-semibold mt-2">
            "{exercise.frase}"
          </p>
        </div>

        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">
            Trascina le parole per formare la traduzione:
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {bancaParole.map((parola: string, index: number) => {
              const isSelected = selectedOptions.some(
                (opt) => opt.value === parola
              );
              const selectedOrder = selectedOptions.find(
                (opt) => opt.value === parola
              )?.order;

              return (
                <button
                  key={index}
                  onClick={() => handleOptionClick(parola)}
                  disabled={showResult}
                  className={`px-3 py-2 rounded-md border transition-all duration-200 ${
                    isSelected
                      ? "bg-blue-500 text-white border-blue-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                  } ${
                    showResult
                      ? "cursor-not-allowed opacity-75"
                      : "cursor-pointer"
                  }`}
                >
                  {parola}
                  {isSelected && (
                    <span className="ml-1 bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center inline-flex">
                      {selectedOrder}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedOptions.length > 0 && (
            <div className="bg-gray-50 p-3 rounded border">
              <p className="text-sm text-gray-600 mb-1">Traduzione:</p>
              <p className="font-medium">
                {selectedOptions
                  .sort((a, b) => a.order - b.order)
                  .map((opt) => opt.value)
                  .join(" ")}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCompletaFraseExercise = (exercise: Exercise, data: any) => {
    const opzioni = data.opzioni || [];

    return (
      <div>
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <p className="text-green-800 font-medium">Completa la frase:</p>
          <p className="text-green-900 text-lg font-semibold mt-2">
            "{exercise.frase}"
          </p>
        </div>

        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">
            Seleziona la parola corretta:
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {opzioni.map((opzione: string, index: number) => {
              const isSelected = selectedOptions.some(
                (opt) => opt.value === opzione
              );

              return (
                <button
                  key={index}
                  onClick={() => {
                    // Per questo tipo, solo una selezione
                    setSelectedOptions([{ value: opzione, order: 1 }]);
                  }}
                  disabled={showResult}
                  className={`p-3 rounded-md border transition-all duration-200 ${
                    isSelected
                      ? "bg-green-500 text-white border-green-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:bg-green-50"
                  } ${
                    showResult
                      ? "cursor-not-allowed opacity-75"
                      : "cursor-pointer"
                  }`}
                >
                  {opzione}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderSelezionaCheStateExercise = (exercise: Exercise, data: any) => {
    const bancaParole = data.banca_parole || [];
    const audioUrl = data.audio_url || "";

    return (
      <div>
        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 mb-6">
          <p className="text-purple-800 font-medium">
            Ascolta l'audio e forma la frase:
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full"
            >
              {isPlaying ? "⏸️" : "▶️"}
            </button>
            <span className="text-purple-700">Clicca per ascoltare</span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">
            Seleziona le parole nell'ordine corretto:
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {bancaParole.map((parola: string, index: number) => {
              const isSelected = selectedOptions.some(
                (opt) => opt.value === parola
              );
              const selectedOrder = selectedOptions.find(
                (opt) => opt.value === parola
              )?.order;

              return (
                <button
                  key={index}
                  onClick={() => handleOptionClick(parola)}
                  disabled={showResult}
                  className={`px-3 py-2 rounded-md border transition-all duration-200 ${
                    isSelected
                      ? "bg-purple-500 text-white border-purple-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                  } ${
                    showResult
                      ? "cursor-not-allowed opacity-75"
                      : "cursor-pointer"
                  }`}
                >
                  {parola}
                  {isSelected && (
                    <span className="ml-1 bg-purple-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center inline-flex">
                      {selectedOrder}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedOptions.length > 0 && (
            <div className="bg-gray-50 p-3 rounded border">
              <p className="text-sm text-gray-600 mb-1">Frase formata:</p>
              <p className="font-medium">
                {selectedOptions
                  .sort((a, b) => a.order - b.order)
                  .map((opt) => opt.value)
                  .join(" ")}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSelezionaCoppieExercise = (exercise: Exercise, data: any) => {
    const coppie = data.coppie_mischiate || [];

    return (
      <div>
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
          <p className="text-orange-800 font-medium">
            Abbina ogni parola inglese alla sua traduzione italiana:
          </p>
        </div>

        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">
            Seleziona le coppie nell'ordine corretto:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {coppie.map((parola: string, index: number) => {
              const isSelected = selectedOptions.some(
                (opt) => opt.value === parola
              );
              const selectedOrder = selectedOptions.find(
                (opt) => opt.value === parola
              )?.order;

              return (
                <button
                  key={index}
                  onClick={() => handleOptionClick(parola)}
                  disabled={showResult}
                  className={`p-3 rounded-md border transition-all duration-200 ${
                    isSelected
                      ? "bg-orange-500 text-white border-orange-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:bg-orange-50"
                  } ${
                    showResult
                      ? "cursor-not-allowed opacity-75"
                      : "cursor-pointer"
                  }`}
                >
                  {parola}
                  {isSelected && (
                    <span className="ml-1 bg-orange-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center inline-flex">
                      {selectedOrder}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedOptions.length > 0 && (
            <div className="bg-gray-50 p-3 rounded border">
              <p className="text-sm text-gray-600 mb-1">Coppie selezionate:</p>
              <div className="space-y-1">
                {selectedOptions
                  .sort((a, b) => a.order - b.order)
                  .reduce((pairs, opt, index) => {
                    if (index % 2 === 0) {
                      const nextOpt = selectedOptions.sort(
                        (a, b) => a.order - b.order
                      )[index + 1];
                      if (nextOpt) {
                        pairs.push(`${opt.value} ↔ ${nextOpt.value}`);
                      }
                    }
                    return pairs;
                  }, [] as string[])
                  .map((pair, index) => (
                    <p key={index} className="font-medium">
                      {pair}
                    </p>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
              <p className="text-gray-600 mb-6">
                {currentExercise.descrizione}
              </p>
            )}

            {renderExerciseContent()}

            {/* Submit Button */}
            {!showResult && (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOptions.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md transition-colors duration-200"
              >
                Controlla
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
                      setSelectedOptions([]);
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
