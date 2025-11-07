/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User, Settings, LogOut, Plus, Moon, Sun, HelpCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface HeaderProps {
  user?: {
    id: string;
    email: string;
  };
  showAddCourse?: boolean;
  showSettings?: boolean;
  showLogout?: boolean;
}

export default function Header({
  user,
  showAddCourse = true,
  showSettings = true,
  showLogout = true,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useTranslation();

  // Gestione tema
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    // Aggiorna sia la classe che l'attributo data-theme
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }
  };

  // Chiudi menu quando clicchi fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Errore logout:", error);
      }

      localStorage.removeItem("supabase_token");
      router.push("/");
    } catch (err) {
      console.error("Errore durante il logout:", err);
    } finally {
      setIsMenuOpen(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo e titolo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Learning Platform
              </h1>
            </div>

            {/* Area destra header - Help e Menu utente */}
            {user && (
              <div className="flex items-center gap-3">
                {/* Pulsante Help - sempre visibile */}
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title={t('help')}
                >
                  <HelpCircle className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('help')}
                  </span>
                </button>

                {/* Menu utente */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block">
                      {user.email}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        isMenuOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.email}
                        </p>
                      </div>

                      {/* Menu items */}
                      <div className="py-2">
                        {showAddCourse && (
                          <button
                            onClick={() => {
                              setShowAddCourseModal(true);
                              setIsMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <Plus className="w-4 h-4" />
                            <span>{t("newCourse")}</span>
                          </button>
                        )}

                        {showSettings && (
                          <button
                            onClick={() => {
                              setShowSettingsModal(true);
                              setIsMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <Settings className="w-4 h-4" />
                            <span>{t("settings")}</span>
                          </button>
                        )}

                        {showLogout && (
                          <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center space-x-2"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>{t("logout")}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal per aggiungere corso */}
      {showAddCourseModal && (
        <AddCourseModal
          onClose={() => setShowAddCourseModal(false)}
          user={user}
        />
      )}

      {/* Modal impostazioni */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          user={user}
          theme={theme}
          onThemeChange={toggleTheme}
        />
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-blue-600" />
                {t('help')}
              </h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
              <p>{t('helpMessage')}</p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Modal per aggiungere corso
function AddCourseModal({
  onClose,
  user,
}: {
  onClose: () => void;
  user?: { id: string; email: string };
}) {
  const [courseCode, setCourseCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!courseCode) {
      setError("Inserisci un codice corso");
      return;
    }

    if (!user) {
      setError("Utente non autenticato");
      return;
    }

    setLoading(true);

    try {
      // Verifica se il corso esiste
      const { data: courseExists, error: courseError } = await supabase
        .from("anagrafica_codici")
        .select("codice")
        .eq("codice", courseCode)
        .single();

      if (courseError || !courseExists) {
        setError("Codice corso non valido");
        return;
      }

      // Verifica se l'utente ha già questo corso
      const { data: existingEnrollment } = await supabase
        .from("user_courses")
        .select("*")
        .eq("user_id", user.id)
        .eq("language_code", courseCode)
        .single();

      if (existingEnrollment) {
        setError("Hai già questo corso");
        return;
      }

      // Aggiungi il corso all'utente
      const { error: insertError } = await supabase
        .from("user_courses")
        .insert({
          user_id: user.id,
          language_code: courseCode,
        });

      if (insertError) {
        setError("Errore durante l'aggiunta del corso");
        return;
      }

      setSuccess("Corso aggiunto con successo!");
      setTimeout(() => {
        router.refresh();
        onClose();
      }, 1500);
    } catch (err) {
      setError("Errore durante l'aggiunta del corso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4"></h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Code"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-300">
                {success}
              </p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              disabled={loading}
            >
              ←
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Loading..." : "OK"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal impostazioni
function SettingsModal({
  onClose,
  user,
  theme,
  onThemeChange,
}: {
  onClose: () => void;
  user?: { id: string; email: string };
  theme: "light" | "dark";
  onThemeChange: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { t } = useTranslation();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Tutti i campi sono obbligatori");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Le nuove password non coincidono");
      return;
    }

    if (newPassword.length < 8) {
      setError("La nuova password deve essere di almeno 8 caratteri");
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setError(
        "La password deve contenere almeno una lettera minuscola, una maiuscola e un numero"
      );
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Password aggiornata con successo!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("Errore durante l'aggiornamento della password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          <h2>{t("settings")}</h2>
        </h2>
        {/* Sezione cambio password */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            <h3>{t("changePassword")}</h3>
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <label>{t("currentPassword")}</label>
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <label>{t("newPassword")}</label>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <label>{t("confirmNewPassword")}</label>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-md">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {success && <p>{t("passwordUpdatedSuccess")}</p>}
                </p>
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? t("updatingPassword") : t("updatePassword")}
            </button>
          </form>
        </div>

        {/* Pulsante chiudi */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}