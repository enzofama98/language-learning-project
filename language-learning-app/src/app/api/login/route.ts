import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  // Esempio semplice (in reale andrebbe fatto il controllo con il DB)
  if (email === 'enzo@email.it' && password === 'penegigantesco') {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
