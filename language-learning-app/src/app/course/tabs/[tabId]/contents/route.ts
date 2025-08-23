/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

export async function GET(request: NextRequest, context: any) {
  return withAuth(request, async (req, user) => {
    try {
      const { tabId } = context.params;

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
        return NextResponse.json({ error: 'Scheda non trovata' }, { status: 404 });
      }

      const { data: hasAccess, error: accessError } = await supabaseAdmin
        .from('codici_sbloccati')
        .select('id')
        .eq('user_id', user.id)
        .eq('language_code', tabInfo.course_code)
        .single();

      if (accessError || !hasAccess) {
        return NextResponse.json({ error: 'Accesso al corso non autorizzato' }, { status: 403 });
      }

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
        return NextResponse.json({ error: 'Errore nel caricamento dei contenuti' }, { status: 500 });
      }

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
      return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest, context: any) {
  return withAuth(request, async (req, user) => {
    try {
      const { tabId } = context.params;
      const { contentId, status, percentage } = await req.json();

      if (!contentId || !status) {
        return NextResponse.json({ error: 'contentId e status sono richiesti' }, { status: 400 });
      }

      const validStatuses = ['not_started', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Status non valido' }, { status: 400 });
      }

      const { data: tabData, error: tabDataError } = await supabaseAdmin
        .from('course_tabs')
        .select('course_code')
        .eq('id', tabId)
        .single();

      if (tabDataError || !tabData) {
        return NextResponse.json({ error: 'Scheda non trovata' }, { status: 404 });
      }

      const { data: contentInfo, error: contentError } = await supabaseAdmin
        .from('course_content')
        .select('id')
        .eq('id', contentId)
        .eq('tab_id', tabId)
        .eq('active', true)
        .single();

      if (contentError || !contentInfo) {
        return NextResponse.json({ error: 'Contenuto non trovato' }, { status: 404 });
      }

      const { data: hasAccess, error: accessError } = await supabaseAdmin
        .from('codici_sbloccati')
        .select('id')
        .eq('user_id', user.id)
        .eq('language_code', tabData.course_code)
        .single();

      if (accessError || !hasAccess) {
        return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
      }

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
        .upsert(progressData, { onConflict: 'user_id,content_id' })
        .select()
        .single();

      if (progressError) {
        console.error('Errore aggiornamento progresso:', progressError);
        return NextResponse.json({ error: 'Errore nell\'aggiornamento del progresso' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        progress: updatedProgress,
        message: `Progresso aggiornato a: ${status}`
      });

    } catch (error) {
      console.error('Errore aggiornamento progresso:', error);
      return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
    }
  });
}