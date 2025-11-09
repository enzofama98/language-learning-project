/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import MediaPlayer from "@/app/components/MediaPlayer";
import {
  BookOpen,
  CheckCircle,
  Lock,
  PlayCircle,
  ChevronRight,
  ChevronLeft,
  Home,
  Trophy,
  Clock,
} from "lucide-react";

interface VideoLezione {
  id: number;
  codicelingua: string;
  lezione: number;
  titolo: string;
  descrizione: string;
  url: string;
  durata_minuti: number;
}

export default function Video() {
  const router = useRouter();
  const params = useParams();
  const courseCode = params?.courseCode as string;

  const [videoLezioni, setVideoLezioni] = useState<VideoLezione[]>([]);
  const [currentLesson, setCurrentLesson] = useState<VideoLezione | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideoLezioni = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/videolezioni?language_code=${courseCode}`
        );

        if (!response.ok) {
          throw new Error("Errore nel caricamento delle videolezioni");
        }

        const result = await response.json();
        setVideoLezioni(result.data || []);

        // Imposta la lezione 1 come default
        if (result.data && result.data.length > 0) {
          setCurrentLesson(result.data[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore sconosciuto");
      } finally {
        setLoading(false);
      }
    };

    if (courseCode) {
      fetchVideoLezioni();
    }
  }, [courseCode]);

  const handleLessonSelect = (lesson: VideoLezione) => {
    setCurrentLesson(lesson);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center p-8">
      <div className="w-full max-w-6xl">
        <button
          onClick={() => router.push(`/course/${courseCode}/levels`)}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">livelli</span>
        </button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Videolezioni
        </h1>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!loading && !error && currentLesson && (
          <>
            <div className="mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Lezione {currentLesson.lezione}
                </h2>
                {currentLesson.descrizione && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {currentLesson.descrizione}
                  </p>
                )}
              </div>

              <MediaPlayer src={currentLesson.url} />
            </div>

            {/* Sezione selezione lezioni */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Seleziona una lezione
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoLezioni.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleLessonSelect(lesson)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      currentLesson.id === lesson.id
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full ${
                            currentLesson.id === lesson.id
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {lesson.lezione}
                        </div>
                      </div>
                      {currentLesson.id === lesson.id && (
                        <PlayCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>

                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {lesson.titolo}
                    </h4>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {!loading && !error && videoLezioni.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              Nessuna videolezione disponibile per questo corso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
