// FILE: src/app/login/page.tsx (VERSIONE AGGIORNATA CON TRADUZIONI)
// Sostituisci il contenuto del file esistente con questo

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSelector from "@/app/components/LanguageSelector";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  const validateForm = () => {
    if (!email || !password) {
      setError(t('emailPasswordRequired'));
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('invalidEmail'));
      return false;
    }
    
    if (password.length < 6) {
      setError(t('passwordMinLength'));
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
            setError(t('invalidCredentials'));
            break;
          case 'Too many requests':
            setError(t('tooManyRequests'));
            break;
          default:
            setError(t('loginError') + ": " + error.message);
        }
        return;
      }

      if (data.user) {
        if (data.session?.access_token) {
          localStorage.setItem('supabase_token', data.session.access_token);
        }
        
        router.push("/");
        router.refresh();
      }

    } catch (err) {
      console.error("Errore login:", err);
      setError(t('unexpectedLoginError'));
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
            {t('loginToAccount')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('enterCredentials')}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
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
              placeholder={t('passwordPlaceholder')}
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
              ${loading 
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400'
              }`}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {t('loggingIn')}
              </div>
            ) : (
              t('login')
            )}
          </button>
        </form>
        
        <div className="text-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('noAccount')}{" "}
            <button
              onClick={() => router.push('/signup')}
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('signUpHere')}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}