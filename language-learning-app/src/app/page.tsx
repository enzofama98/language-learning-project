"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

export default function HomePage() {
  const [buttons, setButtons] = useState<Button[]>([]);
  const [user, setUser] = useState<User | null>(null);
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
    } catch (err) {
      console.error("Errore caricamento dati:", err);
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
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
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen flex items-center justify-center">
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

  return (
    <div className="min-h-screen">
      {/* Contenuto principale */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Benvenuto */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            I Tuoi Corsi
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Benvenuto, {user?.email}! Seleziona un corso per iniziare.
          </p>
        </div>

        {/* Statistiche */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {enabledCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Corsi Disponibili
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-400">
                {buttons.length - enabledCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Corsi Bloccati
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {buttons.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Totale Corsi
              </div>
            </div>
          </div>
        </div>

        {/* Lista corsi */}
        <div className="space-y-4">
          {buttons.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center border border-gray-200 dark:border-gray-700">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Nessun corso disponibile
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Usa il menu in alto per aggiungere un nuovo corso con il codice
                fornito.
              </p>
            </div>
          ) : (
            buttons.map((button) => (
              <div
                key={button.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 ${
                  button.enabled
                    ? "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
                onClick={() => handleButtonClick(button)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {button.label}
                      </h3>
                      {button.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          {button.description}
                        </p>
                      )}
                      <div className="flex items-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            button.enabled
                              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {button.enabled ? "✓ Disponibile" : "🔒 Bloccato"}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {button.enabled ? (
                        <svg
                          className="w-6 h-6 text-blue-600 dark:text-blue-400"
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
                      ) : (
                        <svg
                          className="w-6 h-6 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sezione aiuto */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
            Hai bisogno di aiuto?
          </h3>
          <p className="text-blue-800 dark:text-blue-300 text-sm">
            Per sbloccare nuovi corsi, usa il menu utente in alto e seleziona
            "Aggiungi Corso". Inserisci il codice fornito dal tuo insegnante o
            amministratore.
          </p>
        </div>
      </main>
    </div>
  );
}
