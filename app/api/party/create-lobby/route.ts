import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const hostName: string = body?.hostName ?? '';
  const maxScore: number = Number.isInteger(body?.maxScore) && body.maxScore >= 1
    ? Math.min(body.maxScore, 50)
    : 5;

  if (!hostName.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  // Generate a unique lobby code (retry up to 10 times)
  let code = generateCode();
  let codeIsUnique = false;
  for (let i = 0; i < 10; i++) {
    const { data: existing } = await supabase
      .from('lobbies')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!existing) {
      codeIsUnique = true;
      break;
    }
    code = generateCode();
  }

  if (!codeIsUnique) {
    return NextResponse.json(
      { error: 'Could not generate a unique lobby code. Please try again.' },
      { status: 500 }
    );
  }

  const { data: lobby, error: lobbyErr } = await supabase
    .from('lobbies')
    .insert({ code, max_score: maxScore })
    .select()
    .single();

  if (lobbyErr || !lobby) {
    return NextResponse.json(
      { error: lobbyErr?.message ?? 'Failed to create lobby' },
      { status: 500 }
    );
  }

  const { data: player, error: playerErr } = await supabase
    .from('players')
    .insert({ lobby_id: lobby.id, name: hostName.trim(), is_host: true })
    .select()
    .single();

  if (playerErr || !player) {
    return NextResponse.json(
      { error: playerErr?.message ?? 'Failed to create player' },
      { status: 500 }
    );
  }

  return NextResponse.json({ lobby, player });
}
