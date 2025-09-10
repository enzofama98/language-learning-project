// FILE: src/app/course/[courseCode]/levels/page.tsx (VERSIONE AGGIORNATA CON TRADUZIONI)
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
  Home,
  Trophy,
  Target,
  Award,
  TrendingUp
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSelector from "@/app/components/LanguageSelector";

interface LevelInfo {
  level: string;
  total_exercises: number;
  completed_exercises: number;
  total_lessons: number;
  is_locked: boolean;
  is_completed: boolean;
  progress_percentage: number;
  description?: string;
}

interface User {
  id: string;
  email: string;
}

// Colori per i livelli
const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'A1': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700' },
  'A2': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  'B1': { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700' },
  'B2': { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700' },
  'C1': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700' },
  'C2': { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700' }
};

export default function LevelsOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseCode = params?.courseCode as string;
  const { t } = useTranslation();

  const [user, setUser] = useState<User | null>(null);
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [courseName, setCourseName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState({ completed: 0, total: 0 });

  // Descrizioni dei livelli CEFR tradotte
  const getLevelDescription = (level: string): string => {
    switch (level) {
      case 'A1': return t('levelA1Desc');
      case 'A2': return t('levelA2Desc');
      case 'B1': return t('levelB1Desc');
      case 'B2': return t('levelB2Desc');
      case 'C1': return t('levelC1Desc');
      case 'C2': return t('levelC2Desc');
      default: return '';
    }
  };

  useEffect(() => {
    initializePage();
  }, [courseCode]);

  const initializePage = async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();

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
        setError(t('noAccess'));
        return;
      }

      await loadCourseInfo();
      await loadLevelsOverview(session.user.id);
    } catch (err) {
      console.error("Errore inizializzazione:", err);
      setError(t('courseLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const checkCourseAccess = async (userId: string, courseCode: string): Promise<boolean> => {
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

  const loadLevelsOverview = async (userId: string) => {
    try {
      const { data: exercises, error: exercisesError } = await supabase
        .from("anagrafica_esercizi")
        .select("id, livello, lezione")
        .eq("language_code", courseCode.toUpperCase())
        .eq("active", true);

      if (exercisesError) throw exercisesError;

      const { data: progress, error: progressError } = await supabase
        .from("exercise_progress")
        .select("exercise_id, completed")
        .eq("user_id", userId)
        .eq("completed", true);

      if (progressError) throw progressError;

      const completedExercises = new Set(
        progress?.map(p => p.exercise_id) || []
      );

      const levelMap = new Map<string, { 
        exercises: string[], 
        lessons: Set<number>,
        completedCount: number 
      }>();

      exercises?.forEach((ex) => {
        const level = ex.livello || 'A1';
        if (!levelMap.has(level)) {
          levelMap.set(level, { 
            exercises: [], 
            lessons: new Set(),
            completedCount: 0 
          });
        }
        
        const levelData = levelMap.get(level)!;
        levelData.exercises.push(ex.id);
        levelData.lessons.add(ex.lezione);
        
        if (completedExercises.has(ex.id)) {
          levelData.completedCount++;
        }
      });

      const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      
      let totalCompleted = 0;
      let totalExercises = 0;
      let previousLevelCompleted = true;

      const levelsArray: LevelInfo[] = levelOrder
        .filter(level => levelMap.has(level))
        .map((level) => {
          const data = levelMap.get(level)!;
          const totalCount = data.exercises.length;
          const completedCount = data.completedCount;
          const isCompleted = completedCount === totalCount;
          const progressPercentage = totalCount > 0 
            ? Math.round((completedCount / totalCount) * 100) 
            : 0;

          totalCompleted += completedCount;
          totalExercises += totalCount;

          const isLocked = false; // Mantieni sempre sbloccato come nel codice originale
          
          if (!isLocked) {
            previousLevelCompleted = progressPercentage >= 80;
          }

          return {
            level,
            total_exercises: totalCount,
            completed_exercises: completedCount,
            total_lessons: data.lessons.size,
            is_locked: isLocked,
            is_completed: isCompleted,
            progress_percentage: progressPercentage,
            description: getLevelDescription(level)
          };
        });

      setLevels(levelsArray);
      setOverallProgress({ 
        completed: totalCompleted, 
        total: totalExercises 
      });
    } catch (err) {
      console.error("Errore caricamento livelli:", err);
      throw err;
    }
  };

  const handleLevelClick = (level: LevelInfo) => {
    router.push(`/course/${courseCode}/level/${level.level}/lessons`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">{t('loadingLevels')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('error')}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            {t('backToHome')}
          </button>
        </div>
      </div>
    );
  }

  const overallPercentage = overallProgress.total > 0 
    ? Math.round((overallProgress.completed / overallProgress.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {courseName}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('selectLevel')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSelector />
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>{t('home')}</span>
              </button>
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
              {t('totalCourseProgress')}
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
            {overallProgress.completed} {t('exercisesCompleted').replace('esercizi completati', '')} {overallProgress.total} {t('exercisesCompleted')}
          </p>
        </div>
      </div>

      {/* Levels Grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {levels.map((level) => {
            const colors = LEVEL_COLORS[level.level] || LEVEL_COLORS['A1'];
            
            return (
              <div
                key={level.level}
                onClick={() => handleLevelClick(level)}
                className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 p-6 transition-all duration-200 ${
                  level.is_locked
                    ? "border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed"
                    : level.is_completed
                    ? "border-green-300 dark:border-green-700 hover:border-green-400 dark:hover:border-green-600 hover:shadow-md cursor-pointer"
                    : "border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md cursor-pointer"
                }`}
              >
                {/* Lock overlay */}
                {level.is_locked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-50 rounded-lg">
                    <Lock className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                )}

                {/* Level badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${colors.bg} ${colors.border} border-2`}>
                      <span className={`text-2xl font-bold ${colors.text}`}>
                        {level.level}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Livello {level.level}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {level.total_lessons} {t('lessons')}
                      </p>
                    </div>
                  </div>
                  {level.is_completed && (
                    <Award className="w-6 h-6 text-yellow-500" />
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {level.description}
                </p>

                {/* Navigation arrow */}
                {!level.is_locked && (
                  <ChevronRight className="absolute top-1/2 right-4 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                )}
              </div>
            );
          })}
        </div>

        {/* Info message */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
            <Target className="w-5 h-5" />
            {t('progressionSystem')}
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• {t('progressionDesc1')}</li>
            <li>• {t('progressionDesc2')}</li>
            <li>• {t('progressionDesc3')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}