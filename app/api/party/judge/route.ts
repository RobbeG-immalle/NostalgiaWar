import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PARTY_PROMPTS } from '@/lib/party-prompts';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const roundId: string = body?.roundId ?? '';
  const presidentId: string = body?.presidentId ?? '';
  const winnerId: string = body?.winnerId ?? '';

  const { data: round } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .maybeSingle();

  if (!round) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  }

  if (round.president_id !== presidentId) {
    return NextResponse.json(
      { error: 'Only the President can judge this round' },
      { status: 403 }
    );
  }

  if (round.status !== 'judging') {
    return NextResponse.json(
      { error: 'Round is not in the judging phase' },
      { status: 400 }
    );
  }

  // Fetch winner player
  const { data: winnerPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('id', winnerId)
    .maybeSingle();

  if (!winnerPlayer) {
    return NextResponse.json({ error: 'Winner player not found' }, { status: 404 });
  }

  const newScore = winnerPlayer.score + 1;

  // Increment winner's score
  await supabase
    .from('players')
    .update({ score: newScore })
    .eq('id', winnerId);

  // Mark round as finished
  await supabase
    .from('rounds')
    .update({ status: 'finished' })
    .eq('id', roundId);

  // Fetch lobby to check max_score
  const { data: lobby } = await supabase
    .from('lobbies')
    .select('*')
    .eq('id', round.lobby_id)
    .maybeSingle();

  if (!lobby) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  if (newScore >= lobby.max_score) {
    // Game over
    await supabase
      .from('lobbies')
      .update({ status: 'finished' })
      .eq('id', lobby.id);

    return NextResponse.json({
      gameOver: true,
      winner: { ...winnerPlayer, score: newScore },
    });
  }

  // Rotate president to next player (ordered by join time)
  const { data: players } = await supabase
    .from('players')
    .select('id')
    .eq('lobby_id', round.lobby_id)
    .order('joined_at', { ascending: true });

  const playerIds = (players ?? []).map((p: { id: string }) => p.id);
  const currentIndex = playerIds.indexOf(round.president_id);
  const nextPresidentId = playerIds[(currentIndex + 1) % playerIds.length];
  const prompt = PARTY_PROMPTS[Math.floor(Math.random() * PARTY_PROMPTS.length)];

  const { data: nextRound, error: roundErr } = await supabase
    .from('rounds')
    .insert({
      lobby_id: round.lobby_id,
      president_id: nextPresidentId,
      prompt,
    })
    .select()
    .single();

  if (roundErr || !nextRound) {
    return NextResponse.json(
      { error: roundErr?.message ?? 'Failed to create next round' },
      { status: 500 }
    );
  }

  return NextResponse.json({ gameOver: false, nextRound });
}
