"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

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
      // 1. Prima verifica che il codice sia valido
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

      // 2. Registra l'utente con Supabase Auth (senza email confirmation)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Disabilita redirect email
          data: {
            registration_code: code, // Salva il codice nei metadata
          }
        }
      });

      if (signUpError) {
        switch (signUpError.message) {
          case 'User already registered':
            setError("Questo email è già registrato");
            break;
          case 'Password should be at least 6 characters':
            setError("La password deve essere di almeno 6 caratteri");
            break;
          case 'Signup is disabled':
            setError("La registrazione è temporaneamente disabilitata");
            break;
          default:
            setError("Errore durante la registrazione: " + signUpError.message);
        }
        return;
      }

      if (data.user) {
        // 3. Associa il codice all'utente nella tabella codici_sbloccati
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
          // Non bloccare la registrazione per questo errore
        }

        setSuccess("Registrazione completata! Verrai reindirizzato al login.");
        
        // Redirect immediato al login
        setTimeout(() => {
          router.push("/login");
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
              placeholder="Almeno 8 caratteri, con maiuscole, minuscole e numeri"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Conferma Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ripeti la password"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Codice di Accesso
            </label>
            <input
              id="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Inserisci il codice fornito"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
              ${loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
              }`}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Registrazione in corso...
              </div>
            ) : (
              'Registrati'
            )}
          </button>
        </form>
        
        <div className="text-center">
          <span className="text-sm text-gray-600">
            Hai già un account?{" "}
            <button
              onClick={() => router.push('/login')}
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