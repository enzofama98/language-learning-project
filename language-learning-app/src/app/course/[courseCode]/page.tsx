"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

  // Stati specifici per "Seleziona le coppie"
  const [selectedPairs, setSelectedPairs] = useState<SelectedPair[]>([]);
  const [pendingSelection, setPendingSelection] =
    useState<PendingSelection | null>(null);

  useEffect(() => {
    initializePage();
  }, [courseCode]);

  useEffect(() => {
    // Reset quando cambia esercizio
    resetExerciseState();
  }, [currentLessonIndex, currentExerciseIndex]);

  const resetExerciseState = () => {
    setSelectedOptions([]);
    setSelectedPairs([]);
    setPendingSelection(null);
    setShowResult(false);
    setIsCorrect(false);
    setIsPlaying(false);
  };

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
        .select("titolo")
        .eq("codice", courseCode.toUpperCase())
        .single();

      if (!error && data) {
        setCourseName(data.titolo);
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
        .eq("active", true)
        .order("lezione", { ascending: true })
        .order("created_at", { ascending: true });

      if (exercisesError) throw exercisesError;

      // Carica progresso
      const { data: progress, error: progressError } = await supabase
        .from("exercise_progress")
        .select("exercise_id, completed")
        .eq("user_id", userId);

      if (progressError) throw progressError;

      // Organizza per lezioni
      const progressMap = new Map(
        progress?.map((p) => [p.exercise_id, p.completed]) || []
      );

      const lessonMap = new Map<number, Exercise[]>();
      exercises?.forEach((ex) => {
        if (!lessonMap.has(ex.lezione)) {
          lessonMap.set(ex.lezione, []);
        }
        lessonMap.get(ex.lezione)!.push(ex);
      });

      const lessonsArray: Lesson[] = Array.from(lessonMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([lessonNum, exs]) => ({
          lesson_number: lessonNum,
          exercises: exs,
          completed_exercises: exs.filter((ex) => progressMap.get(ex.id))
            .length,
          total_exercises: exs.length,
        }));

      setLessons(lessonsArray);
      setExerciseProgress(progressMap);
    } catch (err) {
      console.error("Errore caricamento esercizi:", err);
      throw err;
    }
  };

  const getCurrentExercise = (): Exercise | null => {
    if (lessons.length === 0 || currentLessonIndex >= lessons.length)
      return null;
    const currentLesson = lessons[currentLessonIndex];
    if (currentExerciseIndex >= currentLesson.exercises.length) return null;
    return currentLesson.exercises[currentExerciseIndex];
  };

  const getCurrentProgress = () => {
    const totalExercises = lessons.reduce(
      (sum, lesson) => sum + lesson.total_exercises,
      0
    );
    const completedExercises = Array.from(exerciseProgress.values()).filter(
      Boolean
    ).length;
    return { completed: completedExercises, total: totalExercises };
  };

  const isCurrentExerciseCompleted = (): boolean => {
    const exercise = getCurrentExercise();
    return exercise ? exerciseProgress.get(exercise.id) || false : false;
  };

  const canMoveToNext = (): boolean => {
    const currentLesson = lessons[currentLessonIndex];
    const hasNextExercise =
      currentExerciseIndex < currentLesson.exercises.length - 1;
    const hasNextLesson = currentLessonIndex < lessons.length - 1;
    return hasNextExercise || hasNextLesson;
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

  // Gestione specifica per "Seleziona le coppie"
  const handleWordClick = (word: string) => {
    if (showResult) return;

    // Controlla se la parola è già selezionata in una coppia
    const existingPair = selectedPairs.find((pair) =>
      pair.words.includes(word)
    );
    if (existingPair) {
      // Rimuovi la coppia esistente
      setSelectedPairs((prev) =>
        prev.filter((pair) => pair.pairId !== existingPair.pairId)
      );
      setPendingSelection(null);
      return;
    }

    // Controlla se la parola è la selezione in sospeso
    if (pendingSelection && pendingSelection.word === word) {
      // Cancella la selezione in sospeso
      setPendingSelection(null);
      return;
    }

    // Se non c'è una selezione in sospeso, inizia una nuova coppia
    if (!pendingSelection) {
      const nextColorIndex = selectedPairs.length % PAIR_COLORS.length;
      setPendingSelection({
        word: word,
        colorIndex: nextColorIndex,
      });
      return;
    }

    // Completa la coppia
    const newPair: SelectedPair = {
      pairId: Date.now(), // ID univoco per la coppia
      words: [pendingSelection.word, word],
      colorIndex: pendingSelection.colorIndex,
    };

    setSelectedPairs((prev) => [...prev, newPair]);
    setPendingSelection(null);
  };

  const getWordStyle = (word: string) => {
    // Controlla se la parola è in una coppia completata
    const pair = selectedPairs.find((p) => p.words.includes(word));
    if (pair) {
      const color = PAIR_COLORS[pair.colorIndex];
      return `${color.bg} text-white ${color.border} shadow-md`;
    }

    // Controlla se è la selezione in sospeso
    if (pendingSelection && pendingSelection.word === word) {
      const color = PAIR_COLORS[pendingSelection.colorIndex];
      return `${color.bg} text-white ${color.border} shadow-md animate-pulse`;
    }

    // Stile di default
    return "bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:bg-orange-50";
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

  const handleRetryExercise = () => {
    resetExerciseState();
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

      // Converte le coppie selezionate in un formato confrontabile
      const userPairsSets = selectedPairs.map((pair) => new Set(pair.words));

      // Converte le coppie corrette in set per il confronto
      const correctPairsSets = Object.entries(correctPairs).map(
        ([key, value]) => new Set([key, value as string])
      );

      // Controlla se abbiamo lo stesso numero di coppie
      if (userPairsSets.length !== correctPairsSets.length) {
        return false;
      }

      // Controlla se ogni coppia utente corrisponde a una coppia corretta
      return userPairsSets.every((userSet) =>
        correctPairsSets.some(
          (correctSet) =>
            userSet.size === correctSet.size &&
            [...userSet].every((word) => correctSet.has(word))
        )
      );
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
      const prevLesson = lessons[currentLessonIndex - 1];
      setCurrentExerciseIndex(prevLesson.exercises.length - 1);
    }
  };

  const hasAnswerSelected = () => {
    const currentExercise = getCurrentExercise();
    if (!currentExercise) return false;

    if (
      currentExercise.tipo_esercizio.toLowerCase() === "seleziona le coppie"
    ) {
      return selectedPairs.length > 0;
    } else {
      return selectedOptions.length > 0;
    }
  };

  const renderExercise = (exercise: Exercise) => {
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
          <p className="text-orange-700 text-sm mt-2">
            Clicca due parole per formare una coppia. Ogni coppia avrà un colore
            diverso.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">
            Seleziona le coppie - ogni coppia avrà un colore diverso:
          </h3>

          {/* Griglia delle parole */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            {coppie.map((parola: string, index: number) => {
              return (
                <button
                  key={index}
                  onClick={() => handleWordClick(parola)}
                  disabled={showResult}
                  className={`p-3 rounded-md border transition-all duration-200 ${getWordStyle(
                    parola
                  )} ${
                    showResult
                      ? "cursor-not-allowed opacity-75"
                      : "cursor-pointer"
                  }`}
                >
                  {parola}
                </button>
              );
            })}
          </div>

          {/* Visualizzazione delle coppie selezionate */}
          {selectedPairs.length > 0 && (
            <div className="bg-gray-50 p-4 rounded border">
              <p className="text-sm text-gray-600 mb-3">Coppie selezionate:</p>
              <div className="space-y-2">
                {selectedPairs.map((pair) => {
                  const color = PAIR_COLORS[pair.colorIndex];
                  return (
                    <div
                      key={pair.pairId}
                      className={`flex items-center justify-between p-2 rounded ${color.bg} bg-opacity-10 border ${color.border} border-opacity-30`}
                    >
                      <span className="font-medium">
                        {pair.words[0]} ↔ {pair.words[1]}
                      </span>
                      <div className={`w-4 h-4 rounded-full ${color.bg}`}></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Indicazione selezione in sospeso */}
          {pendingSelection && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mt-3">
              <p className="text-yellow-800 text-sm">
                Hai selezionato "<strong>{pendingSelection.word}</strong>".
                Clicca su un'altra parola per completare la coppia.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActionButtons = () => {
    const exerciseCompleted = isCurrentExerciseCompleted();

    return (
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousExercise}
          disabled={currentLessonIndex === 0 && currentExerciseIndex === 0}
          className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 px-4 py-2 rounded-md"
        >
          ← Precedente
        </button>

        <div className="flex gap-3">
          {!showResult ? (
            // Prima della verifica
            <button
              onClick={handleSubmitAnswer}
              disabled={!hasAnswerSelected()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md"
            >
              Verifica
            </button>
          ) : (
            // Dopo la verifica
            <div className="flex gap-3">
              {!isCorrect && (
                <button
                  onClick={handleRetryExercise}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md"
                >
                  🔄 Riprova
                </button>
              )}

              {(isCorrect || exerciseCompleted) && canMoveToNext() && (
                <button
                  onClick={goToNextExercise}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
                >
                  Avanti →
                </button>
              )}
            </div>
          )}

          {/* Pulsante sempre disponibile per esercizi già completati */}
          {exerciseCompleted && !showResult && canMoveToNext() && (
            <button
              onClick={goToNextExercise}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
            >
              Avanti →
            </button>
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{courseName}</h1>
              <p className="text-sm text-gray-600">
                Lezione {currentLesson.lesson_number} - Esercizio{" "}
                {currentExerciseIndex + 1} di {currentLesson.exercises.length}
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md"
            >
              Esci
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progresso Generale: {progress.completed}/{progress.total}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round((progress.completed / progress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(progress.completed / progress.total) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Exercise Title */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {currentExercise.text}
            </h2>
            {currentExercise.descrizione && (
              <p className="text-gray-600">{currentExercise.descrizione}</p>
            )}
          </div>

          {/* Exercise Content */}
          {renderExercise(currentExercise)}

          {/* Result Display */}
          {showResult && (
            <div
              className={`p-4 rounded-md mb-6 ${
                isCorrect
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`mr-3 ${
                    isCorrect ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isCorrect ? "✅" : "❌"}
                </div>
                <div>
                  <p
                    className={`font-medium ${
                      isCorrect ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {isCorrect ? "Corretto!" : "Non corretto"}
                  </p>
                  {!isCorrect && (
                    <p className="text-red-700 text-sm mt-1">
                      Soluzione corretta: {currentExercise.soluzione}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {renderActionButtons()}

          {/* Exercise Completion Status */}
          {isCurrentExerciseCompleted() && !showResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm font-medium">
                ✅ Esercizio già completato in precedenza
              </p>
            </div>
          )}
        </div>

        {/* Lesson Progress */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-3">
            Progresso Lezione {currentLesson.lesson_number}
          </h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {currentLesson.completed_exercises}/
              {currentLesson.total_exercises} esercizi completati
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(
                (currentLesson.completed_exercises /
                  currentLesson.total_exercises) *
                  100
              )}
              %
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  (currentLesson.completed_exercises /
                    currentLesson.total_exercises) *
                  100
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* Navigation Help */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            💡 Suggerimenti per la Navigazione
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              • <strong>Verifica:</strong> Controlla la tua risposta prima di
              procedere
            </p>
            <p>
              • <strong>Riprova:</strong> Se sbagli, puoi riprovare l'esercizio
              immediatamente
            </p>
            <p>
              • <strong>Avanti:</strong> Passa al prossimo esercizio quando hai
              completato quello corrente
            </p>
            <p>
              • <strong>Esercizi completati:</strong> Puoi saltare direttamente
              agli esercizi successivi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
