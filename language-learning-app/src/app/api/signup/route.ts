import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  // In un caso reale, salveresti in DB
  console.log('Nuovo utente:', { email, password });

  return NextResponse.json({ success: true });
}
