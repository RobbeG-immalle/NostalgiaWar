'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Lobby, Player } from '@/lib/party-types';

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [addingBot, setAddingBot] = useState(false);

  const loadData = useCallback(async () => {
    const { data: lobbyData } = await supabase
      .from('lobbies')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (!lobbyData) {
      setError('Lobby not found');
      setLoading(false);
      return;
    }

    setLobby(lobbyData as Lobby);

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('lobby_id', lobbyData.id)
      .order('joined_at', { ascending: true });

    setPlayers((playersData as Player[]) ?? []);

    if (lobbyData.status === 'playing') {
      router.push(`/game/${lobbyData.id}`);
      return;
    }

    setLoading(false);
  }, [code, router]);

  useEffect(() => {
    const stored = localStorage.getItem('party_player_id');
    setMyPlayerId(stored);
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!lobby) return;

    const channel = supabase
      .channel(`lobby:${lobby.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'players',
          filter: `lobby_id=eq.${lobby.id}`,
        },
        (payload) => {
          const newPlayer = payload.new as Player;
          setPlayers((prev) => {
            if (prev.some((p) => p.id === newPlayer.id)) return prev;
            return [...prev, newPlayer];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lobbies',
          filter: `id=eq.${lobby.id}`,
        },
        (payload) => {
          const updated = payload.new as Lobby;
          setLobby(updated);
          if (updated.status === 'playing') {
            router.push(`/game/${lobby.id}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobby, router]);

  async function handleStart() {
    if (!lobby || !myPlayerId) return;
    if (players.length < 2) {
      setError('Need at least 2 players to start');
      return;
    }
    setStarting(true);
    setError('');
    try {
      const res = await fetch('/api/party/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId: lobby.id, playerId: myPlayerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Redirect happens via realtime lobby update
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start game');
      setStarting(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleAddBot() {
    if (!lobby || !myPlayerId) return;
    setAddingBot(true);
    setError('');
    try {
      const res = await fetch('/api/party/add-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId: lobby.id, playerId: myPlayerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add bot');
    } finally {
      setAddingBot(false);
    }
  }

  const me = players.find((p) => p.id === myPlayerId);
  const isHost = me?.is_host ?? false;

  if (loading) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center">
        <div className="text-white/50 animate-pulse text-lg">
          Loading lobby...
        </div>
      </main>
    );
  }

  if (!lobby) {
    return (
      <main className="min-h-screen text-white flex flex-col items-center justify-center gap-4">
        <p className="text-[#ff2d55]">{error || 'Lobby not found'}</p>
        <Link
          href="/multiplayer"
          className="text-[#00a6ff] hover:underline text-sm"
        >
          Back to Multiplayer
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 nw-scanlines opacity-30" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#080d18]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/multiplayer"
            className="text-white/50 hover:text-white/80 text-sm transition-colors"
          >
            ← Leave
          </Link>
          <h1 className="text-xl font-black nw-glow-text tracking-wide">
            LOBBY
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* Lobby code */}
        <div className="text-center space-y-2">
          <p className="text-white/50 text-xs uppercase tracking-[0.2em]">
            Share this code with friends
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-black tracking-[0.25em] text-[#ffb347] nw-glow-text font-mono">
              {code}
            </span>
            <button
              onClick={handleCopy}
              className="text-white/40 hover:text-white/70 text-xs border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-all"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Player list */}
        <div className="bg-black/35 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white/80">
              Players ({players.length}/{lobby.max_players})
            </h2>
            <span className="text-xs text-white/40 uppercase tracking-widest">
              Waiting to start...
            </span>
          </div>

          <ul className="space-y-2">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/5"
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${p.is_bot ? 'bg-white/10 border border-white/20' : 'bg-gradient-to-br from-[#0077ff] to-[#00c2ff]'}`}>
                  {p.is_bot ? '🤖' : (p.name[0]?.toUpperCase() ?? '?')}
                </span>
                <span className="flex-1 text-sm font-medium">{p.name}</span>
                {p.is_bot && (
                  <span className="text-xs text-white/40 border border-white/15 rounded-full px-2 py-0.5">
                    Bot
                  </span>
                )}
                {p.is_host && (
                  <span className="text-xs text-[#ffb347] border border-[#ffb347]/30 rounded-full px-2 py-0.5">
                    Host
                  </span>
                )}
                {p.id === myPlayerId && (
                  <span className="text-xs text-white/40">(you)</span>
                )}
              </li>
            ))}
          </ul>

          {players.length < 2 && (
            <p className="text-white/40 text-xs text-center">
              Waiting for more players to join...
            </p>
          )}
        </div>

        {error && (
          <div className="bg-[#ff2d55]/10 border border-[#ff2d55]/30 rounded-xl p-3 text-center text-[#ff2d55] text-sm">
            {error}
          </div>
        )}

        {isHost ? (
          <div className="space-y-3">
            <button
              onClick={handleAddBot}
              disabled={addingBot || players.length >= (lobby.max_players ?? 8)}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white/70"
            >
              {addingBot ? 'Adding...' : '🤖 Add Bot'}
            </button>
            <button
              onClick={handleStart}
              disabled={starting || players.length < 2}
              className="w-full py-4 px-6 rounded-2xl font-black text-base bg-gradient-to-r from-[#0077ff] via-[#00a6ff] to-[#00c2ff] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-[#00a6ff]/30"
            >
              {starting ? 'Starting...' : '🎮 Start Game'}
            </button>
          </div>
        ) : (
          <p className="text-center text-white/40 text-sm">
            Waiting for the host to start the game...
          </p>
        )}
      </div>
    </main>
  );
}
