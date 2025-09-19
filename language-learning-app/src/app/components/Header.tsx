/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */


"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User, Settings, LogOut, Plus, Moon, Sun } from "lucide-react";

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
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

            {/* Menu utente */}
            {user && (
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
                          <span>New course</span>
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
                          <span>Settings</span>
                        </button>
                      )}

                      {showLogout && (
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center space-x-2"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!courseCode.trim()) {
      setError("Inserisci un codice valido");
      return;
    }

    setLoading(true);

    try {
      // Valida il codice
      const codeResponse = await fetch("/api/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: courseCode.trim().toUpperCase() }),
      });

      if (!codeResponse.ok) {
        const errorData = await codeResponse.json();
        setError(errorData.error || "Codice non valido");
        return;
      }

      // Sblocca il codice
      const unlockResponse = await fetch("/api/unlock-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.email,
          code: courseCode.trim().toUpperCase(),
        }),
      });

      if (!unlockResponse.ok) {
        const errorData = await unlockResponse.json();
        setError(errorData.error || "Errore durante l'aggiunta del corso");
        return;
      }

      setSuccess("Corso aggiunto con successo!");
      setCourseCode("");

      // Ricarica la pagina dopo un breve delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError("Errore di connessione. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Aggiungi Nuovo Corso
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Codice Corso
            </label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Inserisci il codice del corso"
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
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Aggiungendo..." : "Aggiungi"}
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
          Impostazioni
        </h2>
        {/* Sezione cambio password */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Cambia Password
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password Attuale
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
                Nuova Password
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
                Conferma Nuova Password
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
                  {success}
                </p>
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Aggiornando..." : "Aggiorna Password"}
            </button>
          </form>
        </div>

        {/* Pulsante chiudi */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
