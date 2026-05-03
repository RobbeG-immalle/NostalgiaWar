import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BOT_NAMES = [
  'Bot Alpha',
  'Bot Beta',
  'Bot Gamma',
  'Bot Delta',
  'Bot Echo',
  'Bot Foxtrot',
  'Bot Ghost',
  'Bot Hunter',
];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lobbyId: string = body?.lobbyId ?? '';
  const playerId: string = body?.playerId ?? '';

  const { data: host } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .eq('lobby_id', lobbyId)
    .maybeSingle();

  if (!host?.is_host) {
    return NextResponse.json(
      { error: 'Only the host can add bots' },
      { status: 403 }
    );
  }

  const { data: lobby } = await supabase
    .from('lobbies')
    .select('*')
    .eq('id', lobbyId)
    .maybeSingle();

  if (!lobby || lobby.status !== 'waiting') {
    return NextResponse.json(
      { error: 'Cannot add bots after the game has started' },
      { status: 400 }
    );
  }

  const { data: existingPlayers } = await supabase
    .from('players')
    .select('is_bot')
    .eq('lobby_id', lobbyId);

  const all = existingPlayers ?? [];

  if (all.length >= lobby.max_players) {
    return NextResponse.json({ error: 'Lobby is full' }, { status: 400 });
  }

  const botCount = all.filter((p: { is_bot: boolean }) => p.is_bot).length;
  const botName = BOT_NAMES[botCount % BOT_NAMES.length];

  const { data: bot, error: botErr } = await supabase
    .from('players')
    .insert({ lobby_id: lobbyId, name: botName, is_host: false, is_bot: true })
    .select()
    .single();

  if (botErr || !bot) {
    return NextResponse.json(
      { error: botErr?.message ?? 'Failed to add bot' },
      { status: 500 }
    );
  }

  return NextResponse.json({ player: bot });
}
