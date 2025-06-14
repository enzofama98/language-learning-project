"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Tipi TypeScript per una migliore type safety
interface Button {
  id: string;
  label: string;
  language_code: string;
  enabled: boolean;
}

interface User {
  email: string;
  // altri campi utente se necessari
}

export default function ButtonsPage() {
  const [buttons, setButtons] = useState<Button[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Verifica se l'utente è loggato e carica i pulsanti
    checkAuthAndLoadButtons();
  }, []);

  const checkAuthAndLoadButtons = async () => {
    try {
      // Prima verifica se l'utente è autenticato
      const authRes = await fetch("/api/check-auth");
      if (!authRes.ok) {
        router.push("/login");
        return;
      }
      
      const userData = await authRes.json();
      setUser(userData.user);

      // Poi carica i pulsanti disponibili per questo utente
      const buttonsRes = await fetch("/api/user-buttons");
      if (!buttonsRes.ok) {
        throw new Error("Errore nel caricamento dei pulsanti");
      }

      const buttonsData = await buttonsRes.json();
      setButtons(buttonsData.buttons);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (button: Button) => {
    if (!button.enabled) return;

    // Qui puoi implementare la logica specifica per ogni pulsante
    // Per esempio, reindirizzare a una pagina del corso/lezione
    try {
      // Esempio: registra l'accesso al contenuto
      await fetch("/api/log-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          language_code: button.language_code,
          button_id: button.id 
        }),
      });

      // Reindirizza al contenuto specifico
      router.push(`/course/${button.language_code}`);
      
      // Oppure mostra un modal/alert
      // alert(`Accesso a: ${button.label}`);
    } catch (err) {
      alert("Errore nell'accesso al contenuto");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Errore durante il logout:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Caricamento...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-red-600">Errore: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header con info utente */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">I Tuoi Corsi</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Ciao, {user?.email}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="flex items-center justify-center py-12">
        <div className="w-4/5 max-w-2xl">
          <div className="mb-6">
            <p className="text-gray-600 text-center">
              Hai accesso a {buttons.filter(b => b.enabled).length} di {buttons.length} corsi
            </p>
          </div>
          
          <div className="flex flex-col gap-4">
            {buttons.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nessun corso disponibile. Contatta l'amministratore.
              </div>
            ) : (
              buttons.map((button) => (
                <button
                  key={button.id}
                  onClick={() => handleClick(button)}
                  disabled={!button.enabled}
                  className={`w-full px-6 py-4 rounded-lg transition-all duration-200 text-lg font-medium
                    ${
                      button.enabled
                        ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-1"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{button.label}</span>
                    <span className="text-sm opacity-75">
                      {button.enabled ? "Disponibile" : "Bloccato"}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}