/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: src/app/course/[courseCode]/level/[levelCode]/lessons/page.tsx (VERSIONE AGGIORNATA CON TRADUZIONI)
// Sostituisci il contenuto del file esistente con questo

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  BookOpen,
  CheckCircle,
  Lock,
  PlayCircle,
  ChevronRight,
  ChevronLeft,
  Home,
  Trophy,
  Clock,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSelector from "@/app/components/LanguageSelector";

interface Exercise {
  id: string;
  completed?: boolean;
}

interface LessonInfo {
  lesson_number: number;
  total_exercises: number;
  completed_exercises: number;
  exercises: Exercise[];
  is_locked: boolean;
  is_completed: boolean;
  progress_percentage: number;
}

interface User {
  id: string;
  email: string;
}

export default function LevelLessonsPage() {
  const params = useParams();
  const router = useRouter();
  const courseCode = params?.courseCode as string;
  const levelCode = params?.levelCode as string;
  const { t } = useTranslation();

  const [user, setUser] = useState<User | null>(null);
  const [lessons, setLessons] = useState<LessonInfo[]>([]);
  const [courseName, setCourseName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState({
    completed: 0,
    total: 0,
  });

  useEffect(() => {
    initializePage();
  }, [courseCode, levelCode]);

  const initializePage = async () => {
    try {
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

      const hasAccess = await checkCourseAccess(session.user.id, courseCode);
      if (!hasAccess) {
        setError(t("noAccess"));
        return;
      }

      await loadCourseInfo();
      await loadLessonsOverview(session.user.id);
    } catch (err) {
      console.error("Errore inizializzazione:", err);
      setError(t("courseLoadError"));
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

  const loadLessonsOverview = async (userId: string) => {
    try {
      const { data: exercises, error: exercisesError } = await supabase
        .from("anagrafica_esercizi")
        .select("id, lezione")
        .eq("language_code", courseCode.toUpperCase())
        .eq("livello", levelCode)
        .eq("active", true)
        .order("lezione", { ascending: true })
        .order("created_at", { ascending: true });

      if (exercisesError) throw exercisesError;

      const { data: progress, error: progressError } = await supabase
        .from("exercise_progress")
        .select("exercise_id, completed")
        .eq("user_id", userId)
        .eq("completed", true);

      if (progressError) throw progressError;

      const completedExercises = new Set(
        progress?.map((p) => p.exercise_id) || []
      );

      const lessonMap = new Map<number, Exercise[]>();
      exercises?.forEach((ex) => {
        if (!lessonMap.has(ex.lezione)) {
          lessonMap.set(ex.lezione, []);
        }
        lessonMap.get(ex.lezione)!.push({
          id: ex.id,
          completed: completedExercises.has(ex.id),
        });
      });

      let totalCompleted = 0;
      let totalExercises = 0;
      let previousLessonCompleted = true;

      const lessonsArray: LessonInfo[] = Array.from(lessonMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([lessonNumber, exercises]) => {
          const completedCount = exercises.filter((ex) => ex.completed).length;
          const totalCount = exercises.length;
          const isCompleted = completedCount === totalCount;
          const progressPercentage =
            totalCount > 0
              ? Math.round((completedCount / totalCount) * 100)
              : 0;

          totalCompleted += completedCount;
          totalExercises += totalCount;

          const isLocked = false// !previousLessonCompleted;

          if (!isLocked) {
            previousLessonCompleted = isCompleted;
          }

          return {
            lesson_number: lessonNumber,
            total_exercises: totalCount,
            completed_exercises: completedCount,
            exercises: exercises,
            is_locked: isLocked,
            is_completed: isCompleted,
            progress_percentage: progressPercentage,
          };
        });

      setLessons(lessonsArray);
      setOverallProgress({
        completed: totalCompleted,
        total: totalExercises,
      });
    } catch (err) {
      console.error("Errore caricamento lezioni:", err);
      throw err;
    }
  };

  const handleLessonClick = (lesson: LessonInfo) => {
    if (lesson.is_locked) {
      alert(t("unlockPreviousLesson"));
      return;
    }

    router.push(
      `/course/${courseCode}/level/${levelCode}/lessons/${lesson.lesson_number}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">{t("loadingLessons")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t("error")}
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            {t("backToHome")}
          </button>
        </div>
      </div>
    );
  }

  const overallPercentage =
    overallProgress.total > 0
      ? Math.round((overallProgress.completed / overallProgress.total) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Sezione superiore: pulsanti lingua + home */}
          <div className="flex items-center justify-end gap-4 mb-4">
            <LanguageSelector />
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>{t("home")}</span>
            </button>
          </div>

          {/* Sezione inferiore: pulsante indietro + titolo + descrizione */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/course/${courseCode}/levels`)}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">{t("backToLevels")}</span>
            </button>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {courseName} - {levelCode}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t("selectLesson")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {t("levelProgress")} {levelCode}
            </h2>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {overallPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${overallPercentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {overallProgress.completed} di {overallProgress.total}{" "}
            {t("exercisesCompleted")}
          </p>
        </div>
      </div>

      {/* Lessons Grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div
              key={lesson.lesson_number}
              onClick={() => handleLessonClick(lesson)}
              className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 p-6 transition-all duration-200 ${
                lesson.is_locked
                  ? "border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed"
                  : lesson.is_completed
                  ? "border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-md cursor-pointer"
                  : "border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md cursor-pointer"
              }`}
            >
              {/* Lock overlay for locked lessons */}
              {lesson.is_locked && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-50 rounded-lg">
                  <Lock className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                </div>
              )}

              {/* Lesson content */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      lesson.is_locked
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-400"
                        : lesson.is_completed
                        ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
                        : "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {lesson.is_locked ? (
                      <Lock className="w-6 h-6" />
                    ) : lesson.is_completed ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <PlayCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("lesson")} {lesson.lesson_number}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {lesson.total_exercises} {t("exercises")}
                    </p>
                  </div>
                </div>
                {!lesson.is_locked && (
                  <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-1" />
                )}
              </div>

              {/* Progress bar */}
              {!lesson.is_locked && (
                <>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        lesson.is_completed
                          ? "bg-green-600 dark:bg-green-500"
                          : "bg-blue-600 dark:bg-blue-500"
                      }`}
                      style={{ width: `${lesson.progress_percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {lesson.completed_exercises}/{lesson.total_exercises}{" "}
                      {t("completed")}
                    </span>
                    <span
                      className={`font-medium ${
                        lesson.is_completed
                          ? "text-green-600 dark:text-green-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {lesson.progress_percentage}%
                    </span>
                  </div>
                </>
              )}

              {/* Status badges */}
              {lesson.is_completed && (
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  <span>{t("completedLesson")}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info message */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t("howItWorks")}
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• {t("howItWorksDesc1")}</li>
            <li>• {t("howItWorksDesc2")}</li>
            <li>• {t("howItWorksDesc3")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
