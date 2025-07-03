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
}

export default function HomePage() {
  const [buttons, setButtons] = useState<Button[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

      // Carica le statistiche utente (implementa questa API)
      await loadUserStats(token);
    } catch (err) {
      console.error("Errore caricamento dati:", err);
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (token: string) => {
    try {
      // Implementa questa API per ottenere le statistiche reali
      const response = await fetch("/api/user-stats", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const statsData = await response.json();
        setUserStats(statsData);
      } else {
        // Fallback con dati mock se l'API non è ancora implementata
        setUserStats({
          totalCourses: buttons.length,
          completedCourses: Math.floor(buttons.length * 0.3),
          inProgressCourses: Math.floor(buttons.length * 0.5),
          totalHoursStudied: 45.5,
          currentStreak: 7,
          longestStreak: 15,
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
        });
      }
    } catch (err) {
      console.error("Errore caricamento statistiche:", err);
      // Usa dati mock come fallback
      setUserStats({
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
      });
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Errore</h2>
          <p className="text-red-600 mb-4">{error}</p>
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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            I Tuoi Corsi
          </h1>
          <p className="text-gray-600">
            Benvenuto, {user?.email}! Seleziona un corso per iniziare.
          </p>
        </div>

        {/* Statistiche Corsi Compatte */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {enabledCount}
              </div>
              <div className="text-xs text-gray-600">Disponibili</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">
                {disabledCount}
              </div>
              <div className="text-xs text-gray-600">Bloccati</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {buttons.length}
              </div>
              <div className="text-xs text-gray-600">Totali</div>
            </div>
          </div>
        </div>

        {/* Dashboard Progressi Utente */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />I Tuoi Progressi
          </h2>

          {userStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Ore di Studio */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      Ore di Studio
                    </p>
                    <p className="text-2xl font-bold text-blue-800">
                      {userStats.totalHoursStudied}h
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              {/* Corsi Completati */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">
                      Completati
                    </p>
                    <p className="text-2xl font-bold text-green-800">
                      {userStats.completedCourses}/{userStats.totalCourses}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>

              {/* Streak Attuale */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">
                      Streak Attuale
                    </p>
                    <p className="text-2xl font-bold text-orange-800">
                      {userStats.currentStreak}
                    </p>
                    <p className="text-xs text-orange-600">giorni</p>
                  </div>
                  <Target className="w-8 h-8 text-orange-500" />
                </div>
              </div>

              {/* Ultima Attività */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">
                      Ultima Attività
                    </p>
                    <p className="text-sm font-bold text-purple-800">
                      {userStats.lastActivityDate ===
                      new Date().toISOString().split("T")[0]
                        ? "Oggi"
                        : userStats.lastActivityDate}
                    </p>
                    <p className="text-xs text-purple-600">
                      {new Date(userStats.lastActivityDate).toLocaleDateString(
                        "it-IT",
                        { month: "long", day: "numeric" }
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
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                Attività Settimanale
              </h3>
              <div className="flex items-end space-x-2 h-32">
                {userStats.weeklyProgress.map((day, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className="w-full bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-600"
                      style={{
                        height: `${Math.max((day.minutes / 60) * 100, 8)}%`,
                        minHeight: "8px",
                      }}
                    />
                    <span className="text-xs text-gray-600 mt-2">
                      {day.day}
                    </span>
                    <span className="text-xs text-gray-500">
                      {day.minutes}min
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lista Corsi */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Corsi Disponibili
          </h2>

          {buttons.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nessun corso disponibile.</p>
            </div>
          ) : (
            buttons.map((button) => (
              <div
                key={button.id}
                onClick={() => handleButtonClick(button)}
                className={`relative p-6 rounded-lg border-2 transition-all duration-200 ${
                  button.enabled
                    ? "border-blue-200 bg-white hover:border-blue-300 hover:shadow-md cursor-pointer"
                    : "border-gray-200 bg-gray-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        button.enabled
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {button.enabled ? (
                        <PlayCircle className="w-6 h-6" />
                      ) : (
                        <Lock className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3
                        className={`text-lg font-semibold ${
                          button.enabled ? "text-gray-900" : "text-gray-500"
                        }`}
                      >
                        {button.label}
                      </h3>
                      {button.description && (
                        <p
                          className={`text-sm ${
                            button.enabled ? "text-gray-600" : "text-gray-400"
                          }`}
                        >
                          {button.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {button.enabled && (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Badge stato */}
                <div className="absolute top-4 right-4">
                  {button.enabled ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Disponibile
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Bloccato
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
