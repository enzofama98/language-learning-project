"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  BookOpen,
  Clock,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  PlayCircle,
  Lock,
  ChevronRight,
} from "lucide-react";

interface Button {
  id: string;
  language_code: string;
  label: string;
  enabled: boolean;
  description?: string;
  created_at?: string;
}

interface User {
  id: string;
  email: string;
}

interface CourseProgress {
  language_code: string;
  total_exercises: number;
  completed_exercises: number;
  completion_percentage: number;
  total_lessons: number;
  completed_lessons: number;
  last_activity: string | null;
  total_time_spent: number | null;
}

interface UserStats {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalHoursStudied: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  weeklyProgress: {
    day: string;
    minutes: number;
  }[];
  // Statistiche extra
  totalExercises?: number;
  completedExercises?: number;
  totalContents?: number;
  completedContents?: number;
  totalSessions?: number;
  averageMinutesPerDay?: number;
  totalActiveDays?: number;
}

export default function HomePage() {
  const [buttons, setButtons] = useState<Button[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [courseProgressMap, setCourseProgressMap] = useState<Map<string, CourseProgress>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      const userData = {
        id: session.user.id,
        email: session.user.email || "",
      };

      setUser(userData);

      // Carica i corsi disponibili usando l'API esistente
      const token = session.access_token;
      const response = await fetch("/api/user-buttons", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Errore nel caricamento dei corsi");
      }

      const buttonsData = await response.json();
      setButtons(buttonsData.buttons || []);

      // Carica le statistiche utente (in parallelo)
      loadUserStats(token);
    } catch (err) {
      console.error("Errore caricamento dati:", err);
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (token: string) => {
    try {
      setStatsLoading(true);

      // Prova a caricare le statistiche dall'API
      const response = await fetch("/api/user-stats", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const statsData = await response.json();
        console.log("Statistiche caricate dall'API:", statsData);
        setUserStats(statsData);
      } else {
        console.warn("API statistiche non disponibile, uso dati mock");
        // Fallback con dati mock basati sui corsi caricati
        const mockStats: UserStats = {
          totalCourses: buttons.length,
          completedCourses: Math.floor(
            buttons.filter((b) => b.enabled).length * 0.3
          ),
          inProgressCourses: Math.floor(
            buttons.filter((b) => b.enabled).length * 0.6
          ),
          totalHoursStudied: 25.5,
          currentStreak: 3,
          longestStreak: 12,
          lastActivityDate: new Date().toISOString().split("T")[0],
          weeklyProgress: [
            { day: "Lun", minutes: 45 },
            { day: "Mar", minutes: 30 },
            { day: "Mer", minutes: 60 },
            { day: "Gio", minutes: 25 },
            { day: "Ven", minutes: 40 },
            { day: "Sab", minutes: 35 },
            { day: "Dom", minutes: 50 },
          ],
          totalExercises: 150,
          completedExercises: 87,
          totalContents: 45,
          completedContents: 23,
          totalSessions: 28,
          averageMinutesPerDay: 35.5,
          totalActiveDays: 15,
        };
        setUserStats(mockStats);
      }
    } catch (err) {
      console.error("Errore caricamento statistiche:", err);

      // Fallback con dati mock minimi
      const fallbackStats: UserStats = {
        totalCourses: buttons.length,
        completedCourses: 0,
        inProgressCourses: 0,
        totalHoursStudied: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date().toISOString().split("T")[0],
        weeklyProgress: Array(7)
          .fill(0)
          .map((_, i) => ({
            day: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"][i],
            minutes: 0,
          })),
        totalExercises: 0,
        completedExercises: 0,
        totalContents: 0,
        completedContents: 0,
        totalSessions: 0,
      };
      setUserStats(fallbackStats);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadAllCoursesProgress = async () => {
  try {
    if (!user) return;

    // Per ogni corso abilitato, chiama la funzione SQL get_course_progress
    const progressPromises = buttons
      .filter(button => button.enabled)
      .map(async (button) => {
        try {
          const { data, error } = await supabase.rpc('get_course_progress', {
            p_user_id: user.id,
            p_language_code: button.language_code
          });

          if (error) {
            console.error(`Errore progresso per ${button.language_code}:`, error);
            return null;
          }

          return {
            language_code: button.language_code,
            progress: data
          };
        } catch (err) {
          console.error(`Errore caricamento progresso ${button.language_code}:`, err);
          return null;
        }
      });

    const results = await Promise.all(progressPromises);
    
    // Crea mappa del progresso
    const progressMap = new Map<string, CourseProgress>();
    results.forEach(result => {
      if (result && result.progress) {
        progressMap.set(result.language_code, result.progress);
      }
    });

    setCourseProgressMap(progressMap);
  } catch (err) {
    console.error("Errore caricamento progresso corsi:", err);
  }
};

useEffect(() => {
  if (user && buttons.length > 0) {
    loadAllCoursesProgress();
  }
}, [user, buttons]);

  const handleButtonClick = async (button: Button) => {
    if (!button.enabled) return;

    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      if (!token) {
        router.push("/login");
        return;
      }

      // Log dell'accesso
      const response = await fetch("/api/log-access", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language_code: button.language_code,
          button_id: button.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Accesso non autorizzato");
      }

      // Redirect al contenuto del corso
      router.push(`/course/${button.language_code}`);
    } catch (err) {
      console.error("Errore accesso corso:", err);
      alert("Errore nell'accesso al corso. Riprova.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Caricamento...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Errore
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  const enabledCount = buttons.filter((b) => b.enabled).length;
  const disabledCount = buttons.length - enabledCount;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            I Tuoi Corsi
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Benvenuto, {user?.email}! Seleziona un corso per iniziare.
          </p>
        </div>

        {/* Statistiche Corsi Compatte */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {enabledCount}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Disponibili
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">
                {disabledCount}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Bloccati
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {buttons.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Totali
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Progressi Utente */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />I Tuoi Progressi
            {statsLoading && (
              <div className="ml-3 w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            )}
          </h2>

          {userStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Ore di Studio */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Ore di Studio
                    </p>
                    <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                      {userStats.totalHoursStudied}h
                    </p>
                    {userStats.averageMinutesPerDay && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {Math.round(userStats.averageMinutesPerDay)}min/giorno
                      </p>
                    )}
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              {/* Corsi Completati */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Completati
                    </p>
                    <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                      {userStats.completedCourses}/{userStats.totalCourses}
                    </p>
                    {userStats.totalCourses > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {Math.round(
                          (userStats.completedCourses /
                            userStats.totalCourses) *
                            100
                        )}
                        %
                      </p>
                    )}
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>

              {/* Streak Attuale */}
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      Streak Attuale
                    </p>
                    <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                      {userStats.currentStreak}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      giorni (max: {userStats.longestStreak})
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-orange-500" />
                </div>
              </div>

              {/* Ultima Attività */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Ultima Attività
                    </p>
                    <p className="text-sm font-bold text-purple-800 dark:text-purple-200">
                      {userStats.lastActivityDate ===
                      new Date().toISOString().split("T")[0]
                        ? "Oggi"
                        : userStats.lastActivityDate}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      {new Date(userStats.lastActivityDate).toLocaleDateString(
                        "it-IT",
                        {
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
          )}

          {/* Grafico Settimanale */}
          {userStats && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                Attività Settimanale
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  (
                  {userStats.weeklyProgress.reduce(
                    (sum, day) => sum + day.minutes,
                    0
                  )}{" "}
                  min totali)
                </span>
              </h3>
              <div className="flex items-end space-x-2 h-32 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                {userStats.weeklyProgress.map((day, index) => {
                  const maxMinutes = Math.max(
                    ...userStats.weeklyProgress.map((d) => d.minutes),
                    60
                  );
                  const height =
                    day.minutes > 0
                      ? Math.max((day.minutes / maxMinutes) * 100, 8)
                      : 4;

                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          day.minutes > 0
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                        style={{ height: `${height}%` }}
                        title={`${day.day}: ${day.minutes} minuti`}
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {day.day}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {day.minutes}min
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Statistiche Extra */}
          {userStats &&
            (userStats.totalExercises || userStats.totalContents) && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {userStats.totalExercises && (
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {userStats.completedExercises}/{userStats.totalExercises}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Esercizi
                    </div>
                  </div>
                )}
                {userStats.totalContents && (
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {userStats.completedContents}/{userStats.totalContents}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Contenuti
                    </div>
                  </div>
                )}
                {userStats.totalSessions && (
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {userStats.totalSessions}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Sessioni
                    </div>
                  </div>
                )}
                {userStats.totalActiveDays && (
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {userStats.totalActiveDays}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Giorni Attivi
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>

{/* Lista Corsi */}
<div className="space-y-4">
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
    Corsi Disponibili
  </h2>

  {buttons.length === 0 ? (
    <div className="text-center py-12">
      <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-500 dark:text-gray-400">
        Nessun corso disponibile.
      </p>
    </div>
  ) : (
    buttons.map((button) => {
      const progress = courseProgressMap.get(button.language_code);
      const percentage = progress?.completion_percentage || 0;
      const isCompleted = percentage === 100;
      
      return (
        <div
          key={button.id}
          onClick={() => handleButtonClick(button)}
          className={`relative p-6 rounded-lg border-2 transition-all duration-200 ${
            button.enabled
              ? "border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md cursor-pointer"
              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  button.enabled
                    ? isCompleted
                      ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
                      : "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                }`}
              >
                {button.enabled ? (
                  isCompleted ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <PlayCircle className="w-6 h-6" />
                  )
                ) : (
                  <Lock className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3
                  className={`text-lg font-semibold ${
                    button.enabled
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {button.label}
                </h3>
                {button.description && (
                  <p
                    className={`text-sm ${
                      button.enabled
                        ? "text-gray-600 dark:text-gray-300"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {button.description}
                  </p>
                )}
                {button.enabled && progress && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-3">
                    <span>{progress.completed_exercises}/{progress.total_exercises} esercizi</span>
                    <span>•</span>
                    <span>{progress.completed_lessons}/{progress.total_lessons} lezioni</span>
                  </div>
                )}
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 ${
                button.enabled
                  ? "text-gray-400 dark:text-gray-500"
                  : "text-gray-300 dark:text-gray-600"
              }`}
            />
          </div>

          {/* Barra di progresso */}
          {button.enabled && progress && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Progresso
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {Math.round(percentage)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    isCompleted
                      ? "bg-green-600 dark:bg-green-500"
                      : percentage > 0
                      ? "bg-blue-600 dark:bg-blue-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              {isCompleted && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                  ✅ Corso completato!
                </p>
              )}
              {progress.last_activity && !isCompleted && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ultimo accesso: {new Date(progress.last_activity).toLocaleDateString('it-IT')}
                </p>
              )}
            </div>
          )}

          {/* Badge stato per corsi non abilitati */}
          {!button.enabled && (
            <div className="absolute top-4 right-4">
              <span className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                Bloccato
              </span>
            </div>
          )}
        </div>
      );
    })
  )}
</div>
      </main>
    </div>
  );
}
