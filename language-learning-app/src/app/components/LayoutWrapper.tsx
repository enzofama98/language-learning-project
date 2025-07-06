"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "./Header";

interface User {
  id: string;
  email: string;
}

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Pagine che non devono mostrare l'header
  const noHeaderPages = ["/login", "/signup"];
  const showHeader = !noHeaderPages.includes(pathname);

  useEffect(() => {
    // Verifica sessione iniziale
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
          });
        }
      } catch (error) {
        console.error("Errore verifica sessione:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Ascolta i cambiamenti di autenticazione
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect automatico basato su autenticazione
  useEffect(() => {
    if (loading) return;

    const isAuthPage = noHeaderPages.includes(pathname);

    if (!user && !isAuthPage) {
      // Utente non autenticato su pagina protetta
      router.push("/login");
    } else if (user && isAuthPage) {
      // Utente autenticato su pagina di auth
      router.push("/");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Caricamento...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {showHeader && user && (
        <Header
          user={user}
          showAddCourse={true}
          showSettings={true}
          showLogout={true}
        />
      )}

      <main className={showHeader && user ? "pt-16" : ""}>{children}</main>
    </div>
  );
}
