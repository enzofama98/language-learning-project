"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
      // Usa l'autenticazione nativa di Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Gestisci errori specifici
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

      if (data.user) {
        // Salva il token per le chiamate API
        if (data.session?.access_token) {
          localStorage.setItem('supabase_token', data.session.access_token);
        }
        
        // Redirect alla homepage
        router.push("/");
        router.refresh(); // Forza il refresh per aggiornare lo stato auth
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
              onClick={() => router.push('/signup')}
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