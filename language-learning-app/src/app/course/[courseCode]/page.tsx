"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Tipi TypeScript
interface CourseTab {
  id: string;
  tab_name: string;
  tab_type: string;
  tab_icon: string;
  tab_order: number;
  content_count: number;
}

interface CourseContent {
  id: string;
  title: string;
  content_type: string;
  content_data: any;
  content_order: number;
  user_progress_status: string;
  user_progress_percentage: number;
}

interface User {
  id: string;
  email: string;
}

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseCode = params?.courseCode as string;

  const [user, setUser] = useState<User | null>(null);
  const [tabs, setTabs] = useState<CourseTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [contents, setContents] = useState<CourseContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string>("");

  useEffect(() => {
    initializePage();
  }, [courseCode]);

  useEffect(() => {
    if (activeTab) {
      loadTabContents(activeTab);
    }
  }, [activeTab]);

  const initializePage = async () => {
    try {
      // Verifica autenticazione
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        router.push('/');
        return;
      }

      setUser({
        id: session.user.id,
        email: session.user.email || ''
      });

      // Verifica accesso al corso
      const hasAccess = await checkCourseAccess(session.user.id, courseCode);
      if (!hasAccess) {
        setError('Non hai accesso a questo corso');
        return;
      }

      // Carica informazioni corso
      await loadCourseInfo();

      // Carica schede del corso
      await loadCourseTabs();

    } catch (err) {
      console.error('Errore inizializzazione:', err);
      setError('Errore durante il caricamento del corso');
    } finally {
      setLoading(false);
    }
  };

  const checkCourseAccess = async (userId: string, courseCode: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('codici_sbloccati')
        .select('id')
        .eq('user_id', userId)
        .eq('language_code', courseCode.toUpperCase())
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  };

  const loadCourseInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('anagrafica_codici')
        .select('nome')
        .eq('codice', courseCode.toUpperCase())
        .single();

      if (!error && data) {
        setCourseName(data.nome);
      }
    } catch (err) {
      console.error('Errore caricamento info corso:', err);
    }
  };

  const loadCourseTabs = async () => {
    try {
      const { data, error } = await supabase
        .from('course_tabs')
        .select(`
          id,
          tab_name,
          tab_type,
          tab_icon,
          tab_order,
          course_content(count)
        `)
        .eq('course_code', courseCode.toUpperCase())
        .eq('active', true)
        .order('tab_order');

      if (error) {
        throw error;
      }

      const tabsWithCount = data?.map(tab => ({
        id: tab.id,
        tab_name: tab.tab_name,
        tab_type: tab.tab_type,
        tab_icon: tab.tab_icon,
        tab_order: tab.tab_order,
        content_count: Array.isArray(tab.course_content) ? tab.course_content.length : 0
      })) || [];

      setTabs(tabsWithCount);
      
      // Seleziona il primo tab automaticamente
      if (tabsWithCount.length > 0) {
        setActiveTab(tabsWithCount[0].id);
      }

    } catch (err) {
      console.error('Errore caricamento schede:', err);
      setError('Errore nel caricamento delle schede del corso');
    }
  };

  const loadTabContents = async (tabId: string) => {
    setContentLoading(true);
    try {
      const { data, error } = await supabase
        .from('course_content')
        .select(`
          id,
          title,
          content_type,
          content_data,
          content_order,
          user_progress(
            progress_status,
            progress_percentage
          )
        `)
        .eq('tab_id', tabId)
        .eq('active', true)
        .order('content_order');

      if (error) {
        throw error;
      }

      const contentsWithProgress = data?.map(content => ({
        id: content.id,
        title: content.title,
        content_type: content.content_type,
        content_data: content.content_data,
        content_order: content.content_order,
        user_progress_status: content.user_progress?.[0]?.progress_status || 'not_started',
        user_progress_percentage: content.user_progress?.[0]?.progress_percentage || 0
      })) || [];

      setContents(contentsWithProgress);

    } catch (err) {
      console.error('Errore caricamento contenuti:', err);
      setError('Errore nel caricamento dei contenuti');
    } finally {
      setContentLoading(false);
    }
  };

  const updateProgress = async (contentId: string, status: string, percentage: number = 0) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          content_id: contentId,
          progress_status: status,
          progress_percentage: percentage,
          last_accessed_at: new Date().toISOString()
        });

      if (error) {
        console.error('Errore aggiornamento progresso:', error);
      }
    } catch (err) {
      console.error('Errore aggiornamento progresso:', err);
    }
  };

  const getTabIcon = (iconName: string) => {
    const icons: { [key: string]: string } = {
      'book-open': '📖',
      'clipboard-list': '📝',
      'headphones': '🎧',
      'play-circle': '▶️',
      'question-mark-circle': '❓',
      'document-text': '📄'
    };
    return icons[iconName] || '📋';
  };

  const renderContent = (content: CourseContent) => {
    switch (content.content_type) {
      case 'text':
        return <TextContent content={content} onProgress={updateProgress} />;
      case 'exercise':
        return <ExerciseContent content={content} onProgress={updateProgress} />;
      case 'audio':
        return <AudioContent content={content} onProgress={updateProgress} />;
      case 'video':
        return <VideoContent content={content} onProgress={updateProgress} />;
      default:
        return <DefaultContent content={content} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Caricamento corso...</p>
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
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Torna alla Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-gray-900 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Indietro
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{courseName}</h1>
                <p className="text-sm text-gray-600">Codice: {courseCode.toUpperCase()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Ciao, {user?.email}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getTabIcon(tab.tab_icon)}</span>
                    <span>{tab.tab_name}</span>
                    {tab.content_count > 0 && (
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                        {tab.content_count}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {contentLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
              <span className="text-gray-600">Caricamento contenuti...</span>
            </div>
          ) : contents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nessun contenuto disponibile
              </h3>
              <p className="text-gray-600">
                I contenuti per questa sezione saranno disponibili presto.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {contents.map((content) => (
                <div key={content.id} className="border-b border-gray-200 last:border-b-0 pb-8 last:pb-0">
                  {renderContent(content)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componenti per diversi tipi di contenuto
function TextContent({ content, onProgress }: { content: CourseContent; onProgress: (id: string, status: string, percentage: number) => void }) {
  const [isRead, setIsRead] = useState(content.user_progress_status === 'completed');

  const handleMarkAsRead = () => {
    setIsRead(true);
    onProgress(content.id, 'completed', 100);
  };

  const paragraphs = content.content_data?.paragraphs || [];

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
        <button
          onClick={handleMarkAsRead}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isRead
              ? 'bg-green-100 text-green-800'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRead ? '✓ Completato' : 'Segna come letto'}
        </button>
      </div>
      
      <div className="prose max-w-none">
        {paragraphs.map((paragraph: any, index: number) => (
          <div key={index} className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">{paragraph.title}</h3>
            <p className="text-gray-700 leading-relaxed">{paragraph.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExerciseContent({ content, onProgress }: { content: CourseContent; onProgress: (id: string, status: string, percentage: number) => void }) {
  const [showSolution, setShowSolution] = useState(false);
  const [isCompleted, setIsCompleted] = useState(content.user_progress_status === 'completed');

  const handleComplete = () => {
    setIsCompleted(true);
    onProgress(content.id, 'completed', 100);
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {isCompleted ? '✓ Completato' : '📝 Esercizio'}
        </span>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Domanda:</h3>
        <p className="text-blue-800">{content.content_data?.question}</p>
      </div>

      {content.content_data?.hints && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">Suggerimenti:</h3>
          <ul className="list-disc list-inside text-yellow-800">
            {content.content_data.hints.map((hint: string, index: number) => (
              <li key={index}>{hint}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={() => setShowSolution(!showSolution)}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
        >
          {showSolution ? 'Nascondi Soluzione' : 'Mostra Soluzione'}
        </button>
        <button
          onClick={handleComplete}
          className={`px-4 py-2 rounded-md ${
            isCompleted
              ? 'bg-green-100 text-green-800 cursor-default'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isCompleted ? '✓ Completato' : 'Segna come completato'}
        </button>
      </div>

      {showSolution && (
        <div className="mt-6 bg-green-50 border-l-4 border-green-400 p-4">
          <h3 className="font-semibold text-green-900 mb-2">Soluzione:</h3>
          <pre className="bg-gray-800 text-green-400 p-4 rounded-md overflow-x-auto">
            <code>{content.content_data?.solution}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

function AudioContent({ content, onProgress }: { content: CourseContent; onProgress: (id: string, status: string, percentage: number) => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(content.user_progress_status === 'completed');

  const handleComplete = () => {
    setIsCompleted(true);
    onProgress(content.id, 'completed', 100);
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          isCompleted ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
        }`}>
          {isCompleted ? '✓ Ascoltato' : '🎧 Audio'}
        </span>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <div>
            <p className="font-medium text-purple-900">Durata: {Math.floor((content.content_data?.duration || 0) / 60)}:{((content.content_data?.duration || 0) % 60).toString().padStart(2, '0')}</p>
            <p className="text-sm text-purple-700">Clicca play per ascoltare</p>
          </div>
        </div>

        {content.content_data?.transcript && (
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold mb-2">Trascrizione:</h3>
            <p className="text-gray-700">{content.content_data.transcript}</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <button
          onClick={handleComplete}
          className={`px-4 py-2 rounded-md ${
            isCompleted
              ? 'bg-green-100 text-green-800 cursor-default'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isCompleted ? '✓ Completato' : 'Segna come ascoltato'}
        </button>
      </div>
    </div>
  );
}

function VideoContent({ content, onProgress }: { content: CourseContent; onProgress: (id: string, status: string, percentage: number) => void }) {
  const [isCompleted, setIsCompleted] = useState(content.user_progress_status === 'completed');

  const handleComplete = () => {
    setIsCompleted(true);
    onProgress(content.id, 'completed', 100);
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          isCompleted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isCompleted ? '✓ Visto' : '🎥 Video'}
        </span>
      </div>

      <div className="bg-gray-100 border border-gray-300 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🎥</div>
        <p className="text-gray-600 mb-4">Player video sarà implementato qui</p>
        <p className="text-sm text-gray-500">URL: {content.content_data?.video_url || 'Non disponibile'}</p>
      </div>

      <div className="mt-4">
        <button
          onClick={handleComplete}
          className={`px-4 py-2 rounded-md ${
            isCompleted
              ? 'bg-green-100 text-green-800 cursor-default'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isCompleted ? '✓ Completato' : 'Segna come visto'}
        </button>
      </div>
    </div>
  );
}

function DefaultContent({ content }: { content: CourseContent }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h2>
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📋</div>
        <p className="text-gray-600 mb-2">Tipo di contenuto: {content.content_type}</p>
        <p className="text-sm text-gray-500">Renderer specifico non ancora implementato</p>
      </div>
    </div>
  );
}