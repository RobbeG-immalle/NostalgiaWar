import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PARTY_PROMPTS } from '@/lib/party-prompts';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lobbyId: string = body?.lobbyId ?? '';
  const playerId: string = body?.playerId ?? '';

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .eq('lobby_id', lobbyId)
    .maybeSingle();

  if (!player?.is_host) {
    return NextResponse.json(
      { error: 'Only the host can start the game' },
      { status: 403 }
    );
  }

  const { data: players } = await supabase
    .from('players')
    .select('id')
    .eq('lobby_id', lobbyId);

  if (!players || players.length < 2) {
    return NextResponse.json(
      { error: 'Need at least 2 players to start' },
      { status: 400 }
    );
  }

  // Mark lobby as playing
  await supabase
    .from('lobbies')
    .update({ status: 'playing' })
    .eq('id', lobbyId);

  // Pick a random first president
  const president = players[Math.floor(Math.random() * players.length)];
  const prompt = PARTY_PROMPTS[Math.floor(Math.random() * PARTY_PROMPTS.length)];

  const { data: round, error: roundErr } = await supabase
    .from('rounds')
    .insert({ lobby_id: lobbyId, president_id: president.id, prompt })
    .select()
    .single();

  if (roundErr || !round) {
    return NextResponse.json(
      { error: roundErr?.message ?? 'Failed to create round' },
      { status: 500 }
    );
  }

  return NextResponse.json({ round });
}
