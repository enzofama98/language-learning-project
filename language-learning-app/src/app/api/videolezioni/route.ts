
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';


const url = "https://yaxftvgvyuibgzrgejfm.supabase.co"
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlheGZ0dmd2eXVpYmd6cmdlamZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzI0Nzk0MCwiZXhwIjoyMDYyODIzOTQwfQ.4cUnMWYQfDrdJYxkthevUgK7iimd4VqSM6L7cfXGGRE"


const supabase = createClient(
  url!,
  key!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const codicelingua = searchParams.get('language_code');

  if (!codicelingua) {
    return NextResponse.json(
      { error: 'codicelingua parameter is required' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('anagrafica_videolezioni')
      .select('*')
      .eq('language_code', codicelingua)
      .order('lezione', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}