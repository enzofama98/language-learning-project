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
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
    
    // Listener per cambiamenti di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setButtons([]);
          setShowLogin(true);
        } else if (event === 'SIGNED_IN' && session) {
          setShowLogin(false);
          setShowRegister(false);
          await loadUserData(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        // Non autenticato - mostra login
        setShowLogin(true);
        setLoading(false);
        return;
      }

      // Autenticato - carica dati utente
      await loadUserData(session.user);
    } catch (err) {
      console.error('Errore controllo auth:', err);
      setError('Errore durante il caricamento');
      setShowLogin(true);
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
        setShowLogin(true);
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
      
      // Reset stato
      setUser(null);
      setButtons([]);
      setShowLogin(true);
    } catch (err) {
      console.error('Errore durante il logout:', err);
    }
  };

  // Componente di Loading
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

  // Componente Login
  if (showLogin && !showRegister) {
    return <LoginComponent onSwitchToRegister={() => setShowRegister(true)} />;
  }

  // Componente Registrazione
  if (showRegister) {
    return <RegisterComponent onSwitchToLogin={() => {
      setShowRegister(false);
      setShowLogin(true);
    }} />;
  }

  // Componente Errore
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

  // Dashboard principale (utente autenticato)
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

// Componente Login integrato
function LoginComponent({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    if (!email || !password) {
      setError("Email e password sono obbligatori");
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email non valida");
      return false;
    }
    
    if (password.length < 6) {
      setError("La password deve essere di almeno 6 caratteri");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        switch (error.message) {
          case 'Invalid login credentials':
            setError("Credenziali non valide");
            break;
          case 'Too many requests':
            setError("Troppi tentativi. Riprova tra qualche minuto.");
            break;
          default:
            setError("Errore durante il login: " + error.message);
        }
        return;
      }

      if (data.user && data.session?.access_token) {
        localStorage.setItem('supabase_token', data.session.access_token);
      }

    } catch (err) {
      console.error("Errore login:", err);
      setError("Errore imprevisto durante il login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Accedi al tuo account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inserisci le tue credenziali per continuare
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="tua@email.com"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="La tua password"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
              ${loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Accesso in corso...
              </div>
            ) : (
              'Accedi'
            )}
          </button>
        </form>
        
        <div className="text-center">
          <span className="text-sm text-gray-600">
            Non hai un account?{" "}
            <button
              onClick={onSwitchToRegister}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Registrati qui
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

// Componente Registrazione integrato
function RegisterComponent({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateForm = () => {
    if (!email || !password || !confirmPassword || !code) {
      setError("Tutti i campi sono obbligatori");
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email non valida");
      return false;
    }
    
    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri");
      return false;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError("La password deve contenere almeno una lettera minuscola, una maiuscola e un numero");
      return false;
    }
    
    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      return false;
    }
    
    if (code.length < 3) {
      setError("Il codice di accesso non è valido");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      // Verifica codice
      const codeResponse = await fetch("/api/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!codeResponse.ok) {
        const errorData = await codeResponse.json();
        setError(errorData.error || "Codice non valido");
        return;
      }

      // Registrazione utente
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: { registration_code: code }
        }
      });

      if (signUpError) {
        switch (signUpError.message) {
          case 'User already registered':
            setError("Questo email è già registrato");
            break;
          default:
            setError("Errore durante la registrazione: " + signUpError.message);
        }
        return;
      }

      if (data.user) {
        // Associa codice
        const unlockResponse = await fetch("/api/unlock-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId: data.user.id, 
            email: data.user.email,
            code 
          }),
        });

        if (!unlockResponse.ok) {
          console.error("Errore nell'sblocco del codice, ma utente creato");
        }

        setSuccess("Registrazione completata! Verrai reindirizzato al login.");
        
        setTimeout(() => {
          onSwitchToLogin();
        }, 2000);
      }

    } catch (err) {
      console.error("Errore registrazione:", err);
      setError("Errore imprevisto durante la registrazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Crea il tuo account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inserisci i tuoi dati per registrarti
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
          
          <div>
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>
          
          <div>
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>
          
          <div>
            <input
              type="password"
              placeholder="Conferma Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>
          
          <div>
            <input
              type="text"
              placeholder="Codice di Accesso"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium
              ${loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
              }`}
          >
            {loading ? 'Registrazione in corso...' : 'Registrati'}
          </button>
        </form>
        
        <div className="text-center">
          <span className="text-sm text-gray-600">
            Hai già un account?{" "}
            <button
              onClick={onSwitchToLogin}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Accedi qui
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}