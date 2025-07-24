// src/app/course/[courseCode]/page.tsx - Versione aggiornata con sistema 3 tentativi

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ExerciseAttemptsUI from "../../components/ExerciseAttemptsUI";

interface Exercise {
  id: string;
  language_code: string;
  lezione: number;
  text: string;
  tipo_esercizio: string;
  descrizione?: string;
  frase?: string;
  opzionali: any;
  soluzione: string;
  validazione: any;
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

interface SelectedPair {
  pairId: number;
  words: string[];
  colorIndex: number;
}

interface PendingSelection {
  word: string;
  colorIndex: number;
}

// Colori disponibili per le coppie
const PAIR_COLORS = [
  {
    bg: "bg-red-500",
    border: "border-red-600",
    hover: "hover:bg-red-50",
    hoverBorder: "hover:border-red-400",
  },
  {
    bg: "bg-blue-500",
    border: "border-blue-600",
    hover: "hover:bg-blue-50",
    hoverBorder: "hover:border-blue-400",
  },
  {
    bg: "bg-green-500",
    border: "border-green-600",
    hover: "hover:bg-green-50",
    hoverBorder: "hover:border-green-400",
  },
  {
    bg: "bg-purple-500",
    border: "border-purple-600",
    hover: "hover:bg-purple-50",
    hoverBorder: "hover:border-purple-400",
  },
  {
    bg: "bg-yellow-500",
    border: "border-yellow-600",
    hover: "hover:bg-yellow-50",
    hoverBorder: "hover:border-yellow-400",
  },
  {
    bg: "bg-pink-500",
    border: "border-pink-600",
    hover: "hover:bg-pink-50",
    hoverBorder: "hover:border-pink-400",
  },
  {
    bg: "bg-indigo-500",
    border: "border-indigo-600",
    hover: "hover:bg-indigo-50",
    hoverBorder: "hover:border-indigo-400",
  },
  {
    bg: "bg-teal-500",
    border: "border-teal-600",
    hover: "hover:bg-teal-50",
    hoverBorder: "hover:border-teal-400",
  },
];

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseCode = params?.courseCode as string;

  const [user, setUser] = useState<User | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseProgress, setExerciseProgress] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string>("");

  // Stati per le diverse tipologie di esercizi
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<SelectedPair[]>([]);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    initializePage();
  }, [courseCode]);

  useEffect(() => {
    // Reset quando cambia esercizio
    resetExerciseState();
  }, [currentLessonIndex, currentExerciseIndex]);

  const initializePage = async () => {
    try {
      setLoading(true);

      // Verifica autenticazione
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
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

      // Carica esercizi del corso
      await loadCourseExercises();

    } catch (err) {
      console.error("Errore inizializzazione:", err);
      setError("Errore durante il caricamento del corso");
    } finally {
      setLoading(false);
    }
  };

  const checkCourseAccess = async (userId: string, courseCode: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("codici_sbloccati")
        .select("*")
        .eq("user_id", userId)
        .eq("language_code", courseCode)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  };

  const loadCourseExercises = async () => {
    try {
      // Ottieni nome del corso
      const { data: courseData } = await supabase
        .from("anagrafica_codici")
        .select("nome")
        .eq("codice", courseCode)
        .single();

      if (courseData) {
        setCourseName(courseData.nome);
      }

      // Carica esercizi
      const { data: exercisesData, error } = await supabase
        .from("anagrafica_esercizi")
        .select("*")
        .eq("language_code", courseCode)
        .eq("active", true)
        .order("lezione", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Organizza per lezioni
      const lessonsMap = new Map<number, Exercise[]>();
      
      exercisesData?.forEach((exercise) => {
        const lesson = exercise.lezione;
        if (!lessonsMap.has(lesson)) {
          lessonsMap.set(lesson, []);
        }
        lessonsMap.get(lesson)!.push(exercise);
        console.log("exercise data:", exercisesData)
      });

      // Converti in array di lezioni
      const lessonsArray: Lesson[] = Array.from(lessonsMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([lessonNumber, exercises]) => ({
          lesson_number: lessonNumber,
          exercises,
          completed_exercises: 0, // Verrà aggiornato dopo aver caricato il progresso
          total_exercises: exercises.length,
        }));

      setLessons(lessonsArray);

      // Carica progresso utente
      if (user) {
        await loadUserProgress(lessonsArray);
      }

    } catch (err) {
      console.error("Errore caricamento esercizi:", err);
      throw err;
    }
  };

  const loadUserProgress = async (lessonsData: Lesson[]) => {
    if (!user) return;

    try {
      const progressMap = new Map<string, boolean>();

      for (const lesson of lessonsData) {
        for (const exercise of lesson.exercises) {
          // Controlla se l'esercizio è stato completato (usando il nuovo sistema tentativi)
          const { data } = await supabase
            .from("exercise_attempts")
            .select("is_correct")
            .eq("user_id", user.id)
            .eq("exercise_id", exercise.id)
            .eq("is_correct", true)
            .limit(1);

          const isCompleted = Boolean(data && data.length > 0);
          progressMap.set(exercise.id, isCompleted);

        }
      }

      setExerciseProgress(progressMap);

      // Aggiorna i conteggi nelle lezioni
      const updatedLessons = lessonsData.map(lesson => ({
        ...lesson,
        completed_exercises: lesson.exercises.filter(ex => 
          progressMap.get(ex.id) === true
        ).length
      }));

      setLessons(updatedLessons);

    } catch (err) {
      console.error("Errore caricamento progresso:", err);
    }
  };

  const resetExerciseState = () => {
    setSelectedOptions([]);
    setSelectedPairs([]);
    setPendingSelection(null);
    setIsPlaying(false);
  };

  const getCurrentExercise = (): Exercise | null => {
    if (lessons.length === 0 || currentLessonIndex >= lessons.length) return null;
    
    const currentLesson = lessons[currentLessonIndex];
    if (currentExerciseIndex >= currentLesson.exercises.length) return null;
    
    return currentLesson.exercises[currentExerciseIndex];
  };

  const getCurrentProgress = () => {
    const totalExercises = lessons.reduce((sum, lesson) => sum + lesson.total_exercises, 0);
    const completedExercises = lessons.reduce((sum, lesson) => sum + lesson.completed_exercises, 0);
    
    return {
      completed: completedExercises,
      total: totalExercises,
      percentage: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0
    };
  };

  const isCurrentExerciseCompleted = (): boolean => {
    const currentExercise = getCurrentExercise();
    return currentExercise ? exerciseProgress.get(currentExercise.id) === true : false;
  };

  const canMoveToNext = (): boolean => {
    if (currentLessonIndex >= lessons.length) return false;
    
    const currentLesson = lessons[currentLessonIndex];
    const hasNextExercise = currentExerciseIndex < currentLesson.exercises.length - 1;
    const hasNextLesson = currentLessonIndex < lessons.length - 1;
    
    return hasNextExercise || hasNextLesson;
  };

  const goToNextExercise = () => {
    const currentLesson = lessons[currentLessonIndex];
    
    if (currentExerciseIndex < currentLesson.exercises.length - 1) {
      // Prossimo esercizio nella stessa lezione
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else if (currentLessonIndex < lessons.length - 1) {
      // Prima esercizio della prossima lezione
      setCurrentLessonIndex(currentLessonIndex + 1);
      setCurrentExerciseIndex(0);
    }
  };

  const markExerciseCompleted = async (exerciseId: string) => {
    if (!user) return;

    try {
      // Aggiorna lo stato locale
      const newProgress = new Map(exerciseProgress);
      newProgress.set(exerciseId, true);
      setExerciseProgress(newProgress);

      // Aggiorna i conteggi delle lezioni
      const updatedLessons = lessons.map(lesson => ({
        ...lesson,
        completed_exercises: lesson.exercises.filter(ex => 
          newProgress.get(ex.id) === true
        ).length
      }));
      setLessons(updatedLessons);

      // Log dell'accesso per analytics
      await fetch("/api/log-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          languageCode: courseCode,
          courseName: courseName,
          buttonId: `exercise_${exerciseId}`,
          action: "complete"
        }),
      });

    } catch (err) {
      console.error("Errore aggiornamento progresso:", err);
    }
  };

  // Funzioni di validazione per i diversi tipi di esercizio
  const validateAnswer = (): boolean => {
    const exercise = getCurrentExercise();
    if (!exercise) return false;

    switch (exercise.tipo_esercizio) {
      case 'traduci':
        return validateTraduci(exercise);
      case 'completa_frase':
        return validateCompletaFrase(exercise);
      case 'seleziona_che_state':
        return validateSelezionaCheState(exercise);
      case 'seleziona_coppie':
        return validateSelezionaCoppie(exercise);
      default:
        return false;
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
      selectedOptions[0].value.toLowerCase() === exercise.soluzione.toLowerCase()
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
      const userPairsSets = selectedPairs.map((pair) => new Set(pair.words));
      const correctPairsSets = Object.entries(correctPairs).map(
        ([key, value]) => new Set([key, value as string])
      );

      if (userPairsSets.length !== correctPairsSets.length) {
        return false;
      }

      return userPairsSets.every((userSet) =>
        correctPairsSets.some(
          (correctSet) =>
            userSet.size === correctSet.size &&
            [...userSet].every((item) => correctSet.has(item))
        )
      );
    } catch {
      return false;
    }
  };

const hasAnswerSelected = (): boolean => {
  const exercise = getCurrentExercise();
  if (!exercise) return false;

  switch (exercise.tipo_esercizio.toLowerCase()) {
    case 'traduci':
      return selectedOptions.length > 0;
    case 'seleziona_che_state':
    case 'seleziona ciò che senti':
      return selectedOptions.length > 0;
    case 'completa_frase':
    case 'completa la frase':
      return selectedOptions.length === 1;
    case 'seleziona_coppie':
    case 'seleziona le coppie':
      return selectedPairs.length > 0;
    default:
      return false;
  }
};

  const handleAnswerSubmit = async (isCorrect: boolean) => {
    if (isCorrect) {
      const currentExercise = getCurrentExercise();
      if (currentExercise) {
        await markExerciseCompleted(currentExercise.id);
      }
    }
  };

  const handleRetry = () => {
    resetExerciseState();
  };

  const handleOptionClick = (option: string) => {
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


  // Render functions per i diversi tipi di esercizio
  const renderExerciseContent = () => {
    const exercise = getCurrentExercise();
    if (!exercise) return null;

    // Normalizza il tipo di esercizio per gestire maiuscole/minuscole e spazi
    const exerciseType = exercise.tipo_esercizio.toLowerCase().trim();
    
    console.log('🔍 Debug tipo esercizio:', {
      original: exercise.tipo_esercizio,
      normalized: exerciseType,
      exerciseId: exercise.id
    });

    switch (exerciseType) {
      case 'traduci':
        return renderTraduciExercise(exercise);
      case 'completa_frase':
      case 'completa la frase':
        return renderCompletaFraseExercise(exercise);
      case 'seleziona_che_state':
      case 'seleziona ciò che senti':
        return renderSelezionaCheStateExercise(exercise);
      case 'seleziona_coppie':
      case 'seleziona le coppie':
        return renderSelezionaCoppieExercise(exercise);
      default:
        return (
          <div className="text-center py-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-300 font-medium">
                ⚠️ Tipo di esercizio non supportato: "{exercise.tipo_esercizio}"
              </p>
              <p className="text-red-500 dark:text-red-400 text-sm mt-2">
                Tipi supportati: traduci, completa_frase, seleziona_che_state, seleziona_coppie
              </p>
              <details className="mt-3 text-left">
                <summary className="text-sm text-red-600 dark:text-red-300 cursor-pointer">
                  Debug Info
                </summary>
                <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs overflow-auto">
                  {JSON.stringify({
                    id: exercise.id,
                    tipo_esercizio: exercise.tipo_esercizio,
                    normalized: exerciseType,
                    text: exercise.text
                  }, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        );
    }
  };

const renderTraduciExercise = (exercise: Exercise) => {
  const opzioni = exercise.opzionali?.opzioni || [];
  
  // Se non ci sono opzioni nel campo opzionali, controlla banca_parole
  const bancaParole = exercise.opzionali?.banca_parole || opzioni;
  
  if (!bancaParole || bancaParole.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-200">
          ⚠️ Nessuna opzione disponibile per questo esercizio di traduzione.
        </p>
        <details className="mt-2">
          <summary className="text-sm cursor-pointer">Debug</summary>
          <pre className="mt-1 text-xs">{JSON.stringify(exercise.opzionali, null, 2)}</pre>
        </details>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Frase da tradurre */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-lg text-blue-900 dark:text-blue-100 font-medium">
          {exercise.frase}
        </p>
      </div>

      {/* Area di costruzione della risposta */}
      <div className="min-h-[80px] p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="flex flex-wrap gap-2">
          {selectedOptions
            .sort((a, b) => a.order - b.order)
            .map((option, index) => (
              <span
                key={index}
                onClick={() => {
                  // Rimuovi l'opzione cliccata e ricalcola gli ordini
                  const newSelected = selectedOptions.filter((opt) => opt.value !== option.value);
                  const reorderedSelected = newSelected.map((opt, idx) => ({
                    ...opt,
                    order: idx + 1,
                  }));
                  setSelectedOptions(reorderedSelected);
                }}
                className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                {option.value}
              </span>
            ))}
          {selectedOptions.length === 0 && (
            <span className="text-gray-500 dark:text-gray-400 italic">
              Seleziona le parole per costruire la traduzione...
            </span>
          )}
        </div>
      </div>

      {/* Opzioni disponibili */}
      <div className="flex flex-wrap gap-2">
        {bancaParole.map((opzione: string, index: number) => {
          const isSelected = selectedOptions.some(opt => opt.value === opzione);
          const selectedOrder = selectedOptions.find(opt => opt.value === opzione)?.order;
          
          return (
            <button
              key={index}
              onClick={() => handleOptionClick(opzione)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                isSelected
                  ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {opzione}
              {isSelected && (
                <span className="ml-2 bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center inline-flex">
                  {selectedOrder}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

  const renderCompletaFraseExercise = (exercise: Exercise) => {
    const opzioni = exercise.opzionali?.opzioni || [];
    
    return (
      <div className="space-y-6">
        {/* Frase con spazio vuoto */}
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-lg text-green-900 dark:text-green-100">
            {exercise.frase?.split('___').map((part, index, array) => (
              <span key={index}>
                {part}
                {index < array.length - 1 && (
                  <span className="inline-block min-w-[120px] mx-2 px-3 py-1 bg-white dark:bg-gray-700 border-2 border-dashed border-green-300 dark:border-green-600 rounded text-center">
                    {selectedOptions[0]?.value || '___'}
                  </span>
                )}
              </span>
            ))}
          </p>
        </div>

        {/* Opzioni */}
        <div className="flex flex-wrap gap-2">
          {opzioni.map((opzione: string, index: number) => (
            <button
              key={index}
              onClick={() => {
                setSelectedOptions([{ value: opzione, order: 0 }]);
              }}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedOptions[0]?.value === opzione
                  ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-600 text-green-800 dark:text-green-200'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {opzione}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderSelezionaCheStateExercise = (exercise: Exercise) => {
    const opzioni = exercise.opzionali?.banca_parole || [];
    
    return (
      <div className="space-y-6">
        {/* Area di costruzione della risposta */}
        <div className="min-h-[80px] p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-wrap gap-2">
            {selectedOptions
              .sort((a, b) => a.order - b.order)
              .map((option, index) => (
                <span
                  key={index}
                  onClick={() => {
                    setSelectedOptions(selectedOptions.filter((_, i) => i !== index));
                  }}
                  className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                >
                  {option.value}
                </span>
              ))}
            {selectedOptions.length === 0 && (
              <span className="text-gray-500 dark:text-gray-400 italic">
                Seleziona le parole per completare la frase...
              </span>
            )}
          </div>
        </div>

        {/* Opzioni disponibili */}
        <div className="flex flex-wrap gap-2">
          {opzioni.map((opzione: string, index: number) => (
            <button
              key={index}
              onClick={() => {
                setSelectedOptions([
                  ...selectedOptions,
                  { value: opzione, order: selectedOptions.length }
                ]);
              }}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {opzione}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderSelezionaCoppieExercise = (exercise: Exercise) => {
    const opzioni = exercise.opzionali?.coppie_mischiate || [];
    
    const handleWordClick = (word: string) => {
      if (pendingSelection) {
        if (pendingSelection.word === word) {
          // Deseleziona se clicchi sulla stessa parola
          setPendingSelection(null);
          return;
        }

        // Crea una nuova coppia
        const newPair: SelectedPair = {
          pairId: selectedPairs.length,
          words: [pendingSelection.word, word],
          colorIndex: pendingSelection.colorIndex
        };

        setSelectedPairs([...selectedPairs, newPair]);
        setPendingSelection(null);
      } else {
        // Inizia una nuova selezione
        const nextColorIndex = selectedPairs.length % PAIR_COLORS.length;
        setPendingSelection({
          word,
          colorIndex: nextColorIndex
        });
      }
    };

    const getWordStyle = (word: string) => {
      // Controlla se la parola è in una coppia esistente
      const existingPair = selectedPairs.find(pair => pair.words.includes(word));
      if (existingPair) {
        const color = PAIR_COLORS[existingPair.colorIndex];
        return `${color.bg} text-white border-2 ${color.border}`;
      }

      // Controlla se è la parola in selezione
      if (pendingSelection?.word === word) {
        const color = PAIR_COLORS[pendingSelection.colorIndex];
        return `${color.bg} text-white border-2 ${color.border} ring-2 ring-offset-2 ring-gray-400`;
      }

      // Stile normale
      return 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600';
    };

    const isWordDisabled = (word: string) => {
      return selectedPairs.some(pair => pair.words.includes(word));
    };

    return (
      <div className="space-y-6">
        {/* Coppie selezionate */}
        {selectedPairs.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-white">Coppie selezionate:</h4>
            <div className="space-y-2">
              {selectedPairs.map((pair, index) => {
                const color = PAIR_COLORS[pair.colorIndex];
                return (
                  <div
                    key={index}
                    className="flex items-center space-x-2"
                  >
                    <div className={`${color.bg} text-white px-3 py-1 rounded-full text-sm`}>
                      {pair.words[0]}
                    </div>
                    <span className="text-gray-500">↔</span>
                    <div className={`${color.bg} text-white px-3 py-1 rounded-full text-sm`}>
                      {pair.words[1]}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPairs(selectedPairs.filter((_, i) => i !== index));
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Istruzioni */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            💡 Clicca su due parole per creare una coppia. 
            {pendingSelection && (
              <span className="font-medium"> Hai selezionato "{pendingSelection.word}", ora clicca sulla parola da abbinare.</span>
            )}
          </p>
        </div>

        {/* Opzioni disponibili */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {opzioni.map((opzione: string, index: number) => (
            <button
              key={index}
              onClick={() => handleWordClick(opzione)}
              disabled={isWordDisabled(opzione)}
              className={`px-4 py-3 rounded-lg border transition-colors disabled:cursor-not-allowed ${getWordStyle(opzione)}`}
            >
              {opzione}
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Caricamento corso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Errore</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Corso Completato!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Hai completato tutti gli esercizi di {courseName}
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header del corso */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {courseName}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Lezione {currentLesson.lesson_number} - Esercizio {currentExerciseIndex + 1}
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md"
            >
              ← Indietro
            </button>
          </div>

          {/* Progresso generale */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progresso Generale
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {progress.completed}/{progress.total} esercizi ({progress.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Contenuto dell'esercizio */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {currentExercise.text}
            </h2>
            {currentExercise.descrizione && (
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {currentExercise.descrizione}
              </p>
            )}
          </div>

          {/* Contenuto specifico per tipo di esercizio */}
          {renderExerciseContent()}

          {/* Sistema tentativi con UI migliorata */}
          <div className="mt-8">
            <ExerciseAttemptsUI
              exercise={currentExercise}
              selectedOptions={selectedOptions}
              onAnswerSubmit={handleAnswerSubmit}
              onRetry={handleRetry}
              onNext={goToNextExercise}
              canMoveNext={canMoveToNext()}
              validateAnswer={validateAnswer}
              hasAnswerSelected={hasAnswerSelected}
            />
          </div>

          {/* Stato completamento esercizio precedente */}
          {isCurrentExerciseCompleted() && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                ✅ Hai già completato questo esercizio in precedenza
              </p>
            </div>
          )}
        </div>

        {/* Progresso lezione corrente */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">
            Progresso Lezione {currentLesson.lesson_number}
          </h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentLesson.completed_exercises}/{currentLesson.total_exercises} esercizi completati
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round((currentLesson.completed_exercises / currentLesson.total_exercises) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(currentLesson.completed_exercises / currentLesson.total_exercises) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Suggerimenti per la navigazione */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            💡 Nuovo Sistema a 3 Tentativi
          </h4>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <p>• <strong>3 tentativi disponibili</strong> per ogni esercizio</p>
            <p>• <strong>Feedback immediato</strong> dopo ogni tentativo</p>
            <p>• <strong>Soluzione mostrata</strong> dopo il terzo tentativo fallito</p>
            <p>• <strong>Progresso salvato</strong> automaticamente</p>
          </div>
        </div>
      </div>
    </div>
  );
}