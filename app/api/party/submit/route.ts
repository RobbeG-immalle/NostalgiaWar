import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function isValidYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      return !!u.searchParams.get('v');
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.length > 1;
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const roundId: string = body?.roundId ?? '';
  const playerId: string = body?.playerId ?? '';
  const youtubeUrl: string = body?.youtubeUrl ?? '';

  if (!isValidYouTubeUrl(youtubeUrl)) {
    return NextResponse.json(
      { error: 'Invalid YouTube URL' },
      { status: 400 }
    );
  }

  const { data: round } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .maybeSingle();

  if (!round || round.status !== 'submitting') {
    return NextResponse.json(
      { error: 'Round is not in the submitting phase' },
      { status: 400 }
    );
  }

  if (round.president_id === playerId) {
    return NextResponse.json(
      { error: 'The President cannot submit a video' },
      { status: 403 }
    );
  }

  const { data: submission, error: subErr } = await supabase
    .from('submissions')
    .insert({ round_id: roundId, player_id: playerId, youtube_url: youtubeUrl })
    .select()
    .single();

  if (subErr || !submission) {
    return NextResponse.json(
      { error: subErr?.message ?? 'Failed to submit video' },
      { status: 500 }
    );
  }

  // Auto-advance to judging when all non-president players have submitted
  const { count: playerCount } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('lobby_id', round.lobby_id)
    .neq('id', round.president_id);

  const { count: submissionCount } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('round_id', roundId);

  if ((playerCount ?? 0) > 0 && (submissionCount ?? 0) >= (playerCount ?? 0)) {
    await supabase
      .from('rounds')
      .update({ status: 'judging' })
      .eq('id', roundId);
  }

  return NextResponse.json({ submission });
}
