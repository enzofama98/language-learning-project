"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Button {
  id: string;
  label: string;
  language_code: string;
  enabled: boolean;
  description?: string;
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
    checkAuthAndLoadData();
    
    // Listener per cambiamenti di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setButtons([]);
          router.push('/login');
        } else if (event === 'SIGNED_IN' && session) {
          await loadUserData(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
        return;
      }

      await loadUserData(session.user);
    } catch (err) {
      console.error('Errore controllo auth:', err);
      setError('Errore durante il caricamento');
      setLoading(false);
    }
  };

  const loadUserData = async (authUser: any) => {
    try {
      setUser({
        id: authUser.id,
        email: authUser.email
      });

      // Carica i pulsanti disponibili per questo utente
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        throw new Error('Token non disponibile');
      }

      const response = await fetch('/api/user-buttons', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nel caricamento dei corsi');
      }

      const data = await response.json();
      setButtons(data.buttons || []);
    } catch (err) {
      console.error('Errore caricamento dati utente:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = async (button: Button) => {
    if (!button.enabled) return;

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        router.push('/login');
        return;
      }

      // Log dell'accesso
      const response = await fetch('/api/log-access', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          language_code: button.language_code,
          button_id: button.id
        })
      });

      if (!response.ok) {
        throw new Error('Accesso non autorizzato');
      }

      // Redirect al contenuto del corso
      router.push(`/course/${button.language_code}`);
    } catch (err) {
      console.error('Errore accesso corso:', err);
      alert('Errore nell\'accesso al corso. Riprova.');
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Errore logout:', error);
      }
      
      // Rimuovi il token dal localStorage
      localStorage.removeItem('supabase_token');
      
      // Il redirect sarà gestito dal listener onAuthStateChange
    } catch (err) {
      console.error('Errore durante il logout:', err);
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  const enabledCount = buttons.filter(b => b.enabled).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">I Tuoi Corsi</h1>
              <p className="text-sm text-gray-600">
                Benvenuto, {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Contenuto principale */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistiche */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{enabledCount}</div>
              <div className="text-sm text-gray-600">Corsi Disponibili</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-400">{buttons.length - enabledCount}</div>
              <div className="text-sm text-gray-600">Corsi Bloccati</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{buttons.length}</div>
              <div className="text-sm text-gray-600">Totale Corsi</div>
            </div>
          </div>
        </div>

        {/* Lista corsi */}
        <div className="space-y-4">
          {buttons.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nessun corso disponibile
              </h3>
              <p className="text-gray-600">
                Contatta l'amministratore per ottenere l'accesso ai corsi.
              </p>
            </div>
          ) : (
            buttons.map((button) => (
              <div
                key={button.id}
                className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 cursor-pointer
                  ${button.enabled 
                    ? 'border-transparent hover:border-blue-300 hover:shadow-md transform hover:-translate-y-1' 
                    : 'border-gray-200 opacity-60'
                  }`}
                onClick={() => handleButtonClick(button)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold mb-2 ${
                        button.enabled ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {button.label}
                      </h3>
                      {button.description && (
                        <p className={`text-sm ${
                          button.enabled ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {button.description}
                        </p>
                      )}
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          button.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {button.enabled ? '✓ Disponibile' : '🔒 Bloccato'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {button.enabled ? (
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}