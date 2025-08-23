import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

// @ts-ignore
export async function GET(
  request: NextRequest,
  { params }: { params: { tabId: string } }
) {
  return withAuth(request, async (req, user) => {
    try {
      const tabId = params.tabId;

      // 1. Verifica che la scheda esista e che l'utente abbia accesso al corso
      const { data: tabInfo, error: tabError } = await supabaseAdmin
        .from('course_tabs')
        .select(`
          id,
          course_code,
          tab_name,
          tab_type
        `)
        .eq('id', tabId)
        .eq('active', true)
        .single();

      if (tabError || !tabInfo) {
        return NextResponse.json({ 
          error: 'Scheda non trovata' 
        }, { status: 404 });
      }

      // 2. Verifica accesso dell'utente al corso
      const { data: hasAccess, error: accessError } = await supabaseAdmin
        .from('codici_sbloccati')
        .select('id')
        .eq('user_id', user.id)
        .eq('language_code', tabInfo.course_code)
        .single();

      if (accessError || !hasAccess) {
        return NextResponse.json({ 
          error: 'Accesso al corso non autorizzato' 
        }, { status: 403 });
      }

      // 3. Ottieni i contenuti della scheda con progresso utente
      const { data: contents, error: contentsError } = await supabaseAdmin
        .from('course_content')
        .select(`
          id,
          title,
          content_type,
          content_data,
          content_order,
          user_progress!left(
            progress_status,
            progress_percentage,
            last_accessed_at
          )
        `)
        .eq('tab_id', tabId)
        .eq('active', true)
        .eq('user_progress.user_id', user.id)
        .order('content_order');

      if (contentsError) {
        console.error('Errore caricamento contenuti:', contentsError);
        return NextResponse.json({ 
          error: 'Errore nel caricamento dei contenuti' 
        }, { status: 500 });
      }

      // 4. Processa i contenuti per includere il progresso utente
      const processedContents = contents?.map(content => ({
        id: content.id,
        title: content.title,
        content_type: content.content_type,
        content_data: content.content_data,
        content_order: content.content_order,
        user_progress_status: content.user_progress?.[0]?.progress_status || 'not_started',
        user_progress_percentage: content.user_progress?.[0]?.progress_percentage || 0,
        last_accessed_at: content.user_progress?.[0]?.last_accessed_at || null
      })) || [];

      // 5. Calcola statistiche della scheda
      const totalContents = processedContents.length;
      const completedContents = processedContents.filter(c => c.user_progress_status === 'completed').length;
      const inProgressContents = processedContents.filter(c => c.user_progress_status === 'in_progress').length;
      const tabProgress = totalContents > 0 ? Math.round((completedContents / totalContents) * 100) : 0;

      return NextResponse.json({ 
        contents: processedContents,
        tab_info: {
          id: tabInfo.id,
          name: tabInfo.tab_name,
          type: tabInfo.tab_type,
          course_code: tabInfo.course_code
        },
        statistics: {
          total_contents: totalContents,
          completed_contents: completedContents,
          in_progress_contents: inProgressContents,
          not_started_contents: totalContents - completedContents - inProgressContents,
          tab_progress_percentage: tabProgress
        }
      });

    } catch (error) {
      console.error('Errore generale API contents:', error);
      return NextResponse.json({ 
        error: 'Errore interno del server' 
      }, { status: 500 });
    }
  });
}

// API per aggiornare il progresso di un contenuto
// @ts-ignore
export async function POST(
  request: NextRequest,
  { params }: { params: { tabId: string } }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { contentId, status, percentage } = await req.json();

      if (!contentId || !status) {
        return NextResponse.json({ 
          error: 'contentId e status sono richiesti' 
        }, { status: 400 });
      }

      // Valida lo status
      const validStatuses = ['not_started', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: 'Status non valido' 
        }, { status: 400 });
      }

      // Prima ottieni la scheda per avere il course_code
      const { data: tabData, error: tabDataError } = await supabaseAdmin
        .from('course_tabs')
        .select('course_code')
        .eq('id', params.tabId)
        .single();

      if (tabDataError || !tabData) {
        return NextResponse.json({ 
          error: 'Scheda non trovata' 
        }, { status: 404 });
      }

      // Verifica che il contenuto appartenga alla scheda
      const { data: contentInfo, error: contentError } = await supabaseAdmin
        .from('course_content')
        .select('id')
        .eq('id', contentId)
        .eq('tab_id', params.tabId)
        .eq('active', true)
        .single();

      if (contentError || !contentInfo) {
        return NextResponse.json({ 
          error: 'Contenuto non trovato' 
        }, { status: 404 });
      }

      // Verifica accesso dell'utente al corso
      const { data: hasAccess, error: accessError } = await supabaseAdmin
        .from('codici_sbloccati')
        .select('id')
        .eq('user_id', user.id)
        .eq('language_code', tabData.course_code)
        .single();

      if (accessError || !hasAccess) {
        return NextResponse.json({ 
          error: 'Accesso non autorizzato' 
        }, { status: 403 });
      }

      // Aggiorna o crea il record di progresso
      const progressData = {
        user_id: user.id,
        content_id: contentId,
        progress_status: status,
        progress_percentage: percentage || (status === 'completed' ? 100 : 0),
        last_accessed_at: new Date().toISOString(),
        ...(status === 'completed' && { completed_at: new Date().toISOString() })
      };

      const { data: updatedProgress, error: progressError } = await supabaseAdmin
        .from('user_progress')
        .upsert(progressData, { 
          onConflict: 'user_id,content_id' 
        })
        .select()
        .single();

      if (progressError) {
        console.error('Errore aggiornamento progresso:', progressError);
        return NextResponse.json({ 
          error: 'Errore nell\'aggiornamento del progresso' 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true,
        progress: updatedProgress,
        message: `Progresso aggiornato a: ${status}`
      });

    } catch (error) {
      console.error('Errore aggiornamento progresso:', error);
      return NextResponse.json({ 
        error: 'Errore interno del server' 
      }, { status: 500 });
    }
  });
}