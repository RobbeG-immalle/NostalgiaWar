import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const code: string = body?.code ?? '';
  const playerName: string = body?.playerName ?? '';

  if (!code.trim() || !playerName.trim()) {
    return NextResponse.json(
      { error: 'Lobby code and name are required' },
      { status: 400 }
    );
  }

  const { data: lobby, error: lobbyErr } = await supabase
    .from('lobbies')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('status', 'waiting')
    .maybeSingle();

  if (lobbyErr || !lobby) {
    return NextResponse.json(
      { error: 'Lobby not found or game has already started' },
      { status: 404 }
    );
  }

  const { count } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('lobby_id', lobby.id);

  if ((count ?? 0) >= lobby.max_players) {
    return NextResponse.json({ error: 'Lobby is full' }, { status: 400 });
  }

  const { data: player, error: playerErr } = await supabase
    .from('players')
    .insert({ lobby_id: lobby.id, name: playerName.trim(), is_host: false })
    .select()
    .single();

  if (playerErr || !player) {
    return NextResponse.json(
      { error: playerErr?.message ?? 'Failed to join lobby' },
      { status: 500 }
    );
  }

  return NextResponse.json({ lobby, player });
}
