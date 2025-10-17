// FILE: src/app/signup/page.tsx (VERSIONE AGGIORNATA CON TRADUZIONI)
// Sostituisci il contenuto del file esistente con questo

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSelector from "@/app/components/LanguageSelector";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  const validateForm = () => {
    if (!email || !password || !confirmPassword || !code) {
      setError(t('allFieldsRequired'));
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('invalidEmail'));
      return false;
    }
    
    if (password.length < 8) {
      setError(t('password8Characters'));
      return false;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError(t('passwordComplexity'));
      return false;
    }
    
    if (password !== confirmPassword) {
      setError(t('passwordsDontMatch'));
      return false;
    }
    
    if (code.length < 3) {
      setError(t('invalidAccessCode'));
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
        setError(errorData.error || t('invalidCode'));
        return;
      }

      // 2. Registra l'utente con Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: {
            registration_code: code,
          }
        }
      });

      if (signUpError) {
        switch (signUpError.message) {
          case 'User already registered':
            setError(t('emailAlreadyRegistered'));
            break;
          case 'Password should be at least 6 characters':
            setError(t('passwordMinLength'));
            break;
          case 'Signup is disabled':
            setError(t('registrationDisabled'));
            break;
          default:
            setError(t('registrationError') + ": " + signUpError.message);
        }
        return;
      }

      if (data.user) {
        // 3. Associa il codice all'utente
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

        setSuccess(t('registrationCompleted'));
        
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }

    } catch (err) {
      console.error("Errore registrazione:", err);
      setError(t('unexpectedRegistrationError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        {/* Language Selector */}
        <div className="flex justify-end">
          <LanguageSelector />
        </div>

        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
            {t('createAccount')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('enterDataToRegister')}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded">
              {success}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                dark:focus:ring-blue-400 dark:focus:border-blue-400"
              placeholder={t('emailPlaceholder')}
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('username')}
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300..."
              placeholder={t('usernamePlaceholder')}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:outline-none focus:ring-blue-500 focus:border-blue-500
                dark:focus:ring-blue-400 dark:focus:border-blue-400"
              placeholder={t('passwordMinLength8')}
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:outline-none focus:ring-blue-500 focus:border-blue-500
                dark:focus:ring-blue-400 dark:focus:border-blue-400"
              placeholder={t('repeatPassword')}
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('accessCode')}
            </label>
            <input
              id="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:outline-none focus:ring-blue-500 focus:border-blue-500
                dark:focus:ring-blue-400 dark:focus:border-blue-400"
              placeholder={t('enterProvidedCode')}
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
              ${loading 
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-green-400'
              }`}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {t('registering')}
              </div>
            ) : (
              t('register')
            )}
          </button>
        </form>
        
        <div className="text-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('alreadyHaveAccount')}{" "}
            <button
              onClick={() => router.push('/login')}
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('loginHere')}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}