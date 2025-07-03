// src/app/api/user-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      console.log(`📊 Caricamento statistiche per utente: ${user.id}`);

      // ========================================
      // STRATEGIA 1: Prova funzione SQL ottimizzata
      // ========================================
      try {
        const { data: optimizedStats, error: optimizedError } = await supabaseAdmin
          .rpc('get_user_dashboard_summary_optimized', { p_user_id: user.id });

        if (!optimizedError && optimizedStats) {
          console.log('✅ Statistiche ottenute tramite funzione SQL ottimizzata');
          return NextResponse.json(optimizedStats);
        }

        console.log('⚠️ Funzione ottimizzata non disponibile, provo quella base:', optimizedError?.message);
      } catch (error) {
        console.log('⚠️ Errore funzione ottimizzata:', error);
      }

      // ========================================
      // STRATEGIA 2: Prova funzione SQL base
      // ========================================
      try {
        const { data: baseStats, error: baseError } = await supabaseAdmin
          .rpc('get_user_dashboard_summary', { p_user_id: user.id });

        if (!baseError && baseStats) {
          console.log('✅ Statistiche ottenute tramite funzione SQL base');
          return NextResponse.json(baseStats);
        }

        console.log('⚠️ Funzione base non disponibile, uso query manuali:', baseError?.message);
      } catch (error) {
        console.log('⚠️ Errore funzione base:', error);
      }

      // ========================================
      // STRATEGIA 3: Query manuali (fallback)
      // ========================================
      console.log('🔄 Fallback alle query individuali');

      // 1. Carica corsi sbloccati
      const { data: unlockedCourses, error: coursesError } = await supabaseAdmin
        .from('codici_sbloccati')
        .select(`
          language_code,
          unlocked_at,
          last_accessed_at,
          access_count,
          anagrafica_codici!inner(nome, active)
        `)
        .eq('user_id', user.id)
        .eq('anagrafica_codici.active', true);

      if (coursesError) {
        console.error('❌ Errore caricamento corsi:', coursesError);
        throw new Error('Errore nel caricamento dei corsi');
      }

      // 2. Carica progresso esercizi (se disponibile)
      let exerciseStats: any[] = [];
      try {
        const { data: exerciseData, error: exerciseError } = await supabaseAdmin
          .from('exercise_progress')
          .select(`
            exercise_id,
            completed,
            attempts,
            first_attempt_at,
            completed_at,
            time_spent_seconds
          `)
          .eq('user_id', user.id);

        if (exerciseError) {
          console.warn('⚠️ Tabella exercise_progress non disponibile:', exerciseError.message);
        } else if (exerciseData && exerciseData.length > 0) {
          // Carica informazioni degli esercizi separatamente
          const exerciseIds = exerciseData.map(ex => ex.exercise_id);
          const { data: exerciseInfo, error: exerciseInfoError } = await supabaseAdmin
            .from('anagrafica_esercizi')
            .select('id, language_code, lezione')
            .in('id', exerciseIds);

          if (!exerciseInfoError && exerciseInfo) {
            // Combina i dati
            exerciseStats = exerciseData.map(progress => {
              const exerciseDetail = exerciseInfo.find(ex => ex.id === progress.exercise_id);
              return {
                ...progress,
                language_code: exerciseDetail?.language_code || 'UNKNOWN',
                lezione: exerciseDetail?.lezione || 0
              };
            });
          } else {
            console.warn('⚠️ Impossibile caricare dettagli esercizi:', exerciseInfoError?.message);
            exerciseStats = exerciseData || [];
          }
        }
      } catch (error) {
        console.warn('⚠️ Tabella exercise_progress non esiste:', error);
      }

      // 3. Carica progresso contenuti (se disponibile)
      let contentStats: any[] = [];
      try {
        const { data: contentData, error: contentError } = await supabaseAdmin
          .from('user_progress')
          .select(`
            content_id,
            progress_status,
            progress_percentage,
            time_spent,
            last_accessed_at,
            completed_at
          `)
          .eq('user_id', user.id);

        if (contentError) {
          console.warn('⚠️ Tabella user_progress non disponibile:', contentError.message);
        } else {
          contentStats = contentData || [];
        }
      } catch (error) {
        console.warn('⚠️ Tabella user_progress non esiste:', error);
      }

      // 4. Carica log di accesso (se disponibile)
      let accessLogs: any[] = [];
      try {
        const { data: accessData, error: accessError } = await supabaseAdmin
          .from('access_logs')
          .select('accessed_at, language_code')
          .eq('user_id', user.id)
          .order('accessed_at', { ascending: false })
          .limit(100);

        if (accessError) {
          console.warn('⚠️ Tabella access_logs non disponibile:', accessError.message);
        } else {
          accessLogs = accessData || [];
        }
      } catch (error) {
        console.warn('⚠️ Tabella access_logs non esiste:', error);
      }

      // 5. Carica attività giornaliera (se disponibile)
      let dailyActivity: any[] = [];
      try {
        const { data: dailyData, error: dailyError } = await supabaseAdmin
          .from('user_daily_activity')
          .select('*')
          .eq('user_id', user.id)
          .order('activity_date', { ascending: false })
          .limit(30);

        if (dailyError) {
          console.warn('⚠️ Tabella user_daily_activity non disponibile:', dailyError.message);
        } else {
          dailyActivity = dailyData || [];
        }
      } catch (error) {
        console.warn('⚠️ Tabella user_daily_activity non esiste nel database');
      }

      // ========================================
      // CALCOLI STATISTICHE
      // ========================================

      const totalCourses = unlockedCourses?.length || 0;
      
      // Calcola corsi completati basato su esercizi
      const courseCompletionMap = new Map<string, { completed: number, total: number }>();
      
      if (exerciseStats && exerciseStats.length > 0) {
        exerciseStats.forEach(stat => {
          const courseCode = stat.anagrafica_esercizi.language_code;
          if (!courseCompletionMap.has(courseCode)) {
            courseCompletionMap.set(courseCode, { completed: 0, total: 0 });
          }
          const courseData = courseCompletionMap.get(courseCode)!;
          courseData.total++;
          if (stat.completed) {
            courseData.completed++;
          }
        });
      }

      // Corso completato se >80% esercizi completati
      const completedCourses = Array.from(courseCompletionMap.values())
        .filter(course => course.total > 0 && (course.completed / course.total) > 0.8)
        .length;

      // Corsi in progresso
      const inProgressCourses = Array.from(courseCompletionMap.values())
        .filter(course => course.total > 0 && course.completed > 0 && (course.completed / course.total) <= 0.8)
        .length;

      // Calcola tempo totale di studio
      let totalTimeSeconds = 0;
      
      if (dailyActivity && dailyActivity.length > 0) {
        // Usa dati da user_daily_activity se disponibili
        totalTimeSeconds = dailyActivity.reduce((sum, day) => sum + ((day.minutes_studied || 0) * 60), 0);
      } else {
        // Fallback: calcola da exercise_progress e user_progress
        const exerciseTime = exerciseStats.reduce((sum, stat) => sum + (stat.time_spent_seconds || 0), 0);
        const contentTime = contentStats.reduce((sum, stat) => sum + (stat.time_spent || 0), 0);
        totalTimeSeconds = exerciseTime + contentTime;
      }

      const totalHoursStudied = Math.round((totalTimeSeconds / 3600) * 10) / 10;

      // Calcola streak
      const streakData = calculateUserStreaks(accessLogs, dailyActivity);

      // Trova ultima attività
      const lastActivityDate = findLastActivityDate(accessLogs, exerciseStats, contentStats, dailyActivity);

      // Calcola progresso settimanale
      const weeklyProgress = calculateWeeklyProgress(accessLogs, exerciseStats, contentStats, dailyActivity);

      // ========================================
      // ASSEMBLA RISPOSTA
      // ========================================
      const userStats = {
        totalCourses,
        completedCourses,
        inProgressCourses,
        totalHoursStudied,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        lastActivityDate: lastActivityDate.split('T')[0],
        weeklyProgress,
        // Statistiche extra
        totalExercises: exerciseStats.length,
        completedExercises: exerciseStats.filter(s => s.completed).length,
        totalContents: contentStats.length,
        completedContents: contentStats.filter(s => s.progress_status === 'completed').length,
        totalSessions: accessLogs.length,
        averageMinutesPerDay: dailyActivity && dailyActivity.length > 0 
          ? Math.round(dailyActivity.reduce((sum, day) => sum + (day.minutes_studied || 0), 0) / dailyActivity.length)
          : totalHoursStudied > 0 ? Math.round((totalHoursStudied * 60) / 30) : 0,
        totalActiveDays: dailyActivity && dailyActivity.length > 0 
          ? dailyActivity.length
          : (accessLogs.length > 0 ? new Set(accessLogs.map(log => log.accessed_at.split('T')[0])).size : 0)
      };

      console.log('✅ Statistiche calcolate (fallback):', {
        totalCourses: userStats.totalCourses,
        completedCourses: userStats.completedCourses,
        totalHoursStudied: userStats.totalHoursStudied,
        currentStreak: userStats.currentStreak,
        dataSourcesUsed: {
          courses: !!unlockedCourses,
          exercises: !!exerciseStats,
          contents: !!contentStats,
          accessLogs: !!accessLogs,
          dailyActivity: !!dailyActivity
        }
      });

      return NextResponse.json(userStats);

    } catch (error) {
      console.error('❌ Errore generale user-stats:', error);
      
      // Fallback finale: statistiche minime
      const fallbackStats = {
        totalCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        totalHoursStudied: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date().toISOString().split('T')[0],
        weeklyProgress: Array(7).fill(0).map((_, i) => ({
          day: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"][i],
          minutes: 0
        })),
        totalExercises: 0,
        completedExercises: 0,
        totalContents: 0,
        completedContents: 0,
        totalSessions: 0,
        averageMinutesPerDay: 0,
        totalActiveDays: 0
      };

      return NextResponse.json(fallbackStats);
    }
  });
}

// ========================================
// FUNZIONI HELPER
// ========================================

function calculateUserStreaks(accessLogs: any[], dailyActivity: any[]): { currentStreak: number, longestStreak: number } {
  let activityDates: string[] = [];

  // Usa dailyActivity se disponibile, altrimenti accessLogs
  if (dailyActivity && dailyActivity.length > 0) {
    activityDates = dailyActivity
      .filter(day => (day.minutes_studied || 0) > 0 || (day.exercises_completed || 0) > 0 || (day.contents_completed || 0) > 0)
      .map(day => day.activity_date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  } else if (accessLogs && accessLogs.length > 0) {
    const uniqueDates = new Set(accessLogs.map(log => log.accessed_at.split('T')[0]));
    activityDates = Array.from(uniqueDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }

  if (activityDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Calcola streak attuale
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Inizia da oggi o ieri
  let checkDate = activityDates.includes(today) ? today : 
                  activityDates.includes(yesterday) ? yesterday : null;

  if (checkDate) {
    let currentDate = new Date(checkDate);
    
    for (const activityDate of activityDates) {
      const activityDateObj = new Date(activityDate);
      if (activityDateObj.toISOString().split('T')[0] === currentDate.toISOString().split('T')[0]) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (activityDateObj < currentDate) {
        break;
      }
    }
  }

  // Calcola streak più lungo
  let longestStreak = 0;
  let tempStreak = 1;
  
  for (let i = 1; i < activityDates.length; i++) {
    const prevDate = new Date(activityDates[i - 1]);
    const currDate = new Date(activityDates[i]);
    const daysDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

function findLastActivityDate(accessLogs: any[], exerciseStats: any[], contentStats: any[], dailyActivity: any[]): string {
  const dates: string[] = [];

  // Raccogli tutte le date di attività
  if (dailyActivity && dailyActivity.length > 0) {
    dates.push(...dailyActivity.map(day => day.activity_date + 'T12:00:00Z'));
  }

  if (accessLogs && accessLogs.length > 0) {
    dates.push(...accessLogs.map(log => log.accessed_at));
  }

  if (exerciseStats && exerciseStats.length > 0) {
    dates.push(...exerciseStats.filter(s => s.completed_at).map(s => s.completed_at));
  }

  if (contentStats && contentStats.length > 0) {
    dates.push(...contentStats.filter(s => s.last_accessed_at).map(s => s.last_accessed_at));
  }

  // Trova la data più recente
  if (dates.length > 0) {
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }

  return new Date().toISOString();
}

function calculateWeeklyProgress(accessLogs: any[], exerciseStats: any[], contentStats: any[], dailyActivity: any[]): { day: string, minutes: number }[] {
  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const weeklyData = daysOfWeek.map(day => ({ day, minutes: 0 }));

  // Ottieni gli ultimi 7 giorni
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  // Usa dailyActivity se disponibile
  if (dailyActivity && dailyActivity.length > 0) {
    const dailyMap = new Map(dailyActivity.map(day => [day.activity_date, day.minutes_studied || 0]));
    
    last7Days.forEach((date, index) => {
      weeklyData[index].minutes = dailyMap.get(date) || 0;
    });
    
    return weeklyData;
  }

  // Fallback: calcola da altre fonti
  const dailyMinutes = new Map<string, number>();

  // Aggiungi tempo dagli esercizi
  if (exerciseStats && exerciseStats.length > 0) {
    exerciseStats.forEach(stat => {
      if (stat.completed_at) {
        const date = new Date(stat.completed_at).toISOString().split('T')[0];
        if (last7Days.includes(date)) {
          const minutes = Math.round((stat.time_spent_seconds || 0) / 60);
          dailyMinutes.set(date, (dailyMinutes.get(date) || 0) + minutes);
        }
      }
    });
  }

  // Aggiungi tempo dai contenuti
  if (contentStats && contentStats.length > 0) {
    contentStats.forEach(stat => {
      if (stat.last_accessed_at) {
        const date = new Date(stat.last_accessed_at).toISOString().split('T')[0];
        if (last7Days.includes(date)) {
          const minutes = Math.round((stat.time_spent || 0) / 60);
          dailyMinutes.set(date, (dailyMinutes.get(date) || 0) + minutes);
        }
      }
    });
  }

  // Fallback finale: usa log di accesso (stima 5 min per accesso)
  if (dailyMinutes.size === 0 && accessLogs && accessLogs.length > 0) {
    const dailyAccess = new Map<string, number>();
    accessLogs.forEach(log => {
      const date = new Date(log.accessed_at).toISOString().split('T')[0];
      if (last7Days.includes(date)) {
        dailyAccess.set(date, (dailyAccess.get(date) || 0) + 1);
      }
    });

    dailyAccess.forEach((count, date) => {
      dailyMinutes.set(date, count * 5); // 5 minuti per accesso
    });
  }

  // Popola i dati settimanali
  last7Days.forEach((date, index) => {
    weeklyData[index].minutes = dailyMinutes.get(date) || 0;
  });

  return weeklyData;
}