'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MultiplayerPage() {
  const router = useRouter();

  const [hostName, setHostName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!hostName.trim()) return;
    setCreateLoading(true);
    setError('');
    try {
      const res = await fetch('/api/party/create-lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('party_player_id', data.player.id);
      localStorage.setItem('party_lobby_id', data.lobby.id);
      router.push(`/lobby/${data.lobby.code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleJoin() {
    if (!joinCode.trim() || !joinName.trim()) return;
    setJoinLoading(true);
    setError('');
    try {
      const res = await fetch('/api/party/join-lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: joinCode.toUpperCase().trim(),
          playerName: joinName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('party_player_id', data.player.id);
      localStorage.setItem('party_lobby_id', data.lobby.id);
      router.push(`/lobby/${data.lobby.code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 nw-scanlines opacity-30" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#080d18]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-white/50 hover:text-white/80 text-sm transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-black nw-glow-text tracking-wide">
            PARTY MODE
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white/95 nw-glow-text tracking-wide">
            NOSTALGIA WAR
          </h2>
          <p className="text-white/55 text-sm uppercase tracking-[0.2em]">
            Party Mode – Play with friends in real-time
          </p>
        </div>

        {error && (
          <div className="bg-[#ff2d55]/10 border border-[#ff2d55]/30 rounded-xl p-3 text-center text-[#ff2d55] text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Create Lobby */}
          <div className="bg-black/35 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-lg text-[#00a6ff]">Create Lobby</h3>
            <p className="text-white/50 text-sm">
              Start a new game and invite friends
            </p>
            <input
              type="text"
              placeholder="Your name"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              maxLength={20}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#00a6ff]/50 text-sm"
            />
            <button
              onClick={handleCreate}
              disabled={createLoading || !hostName.trim()}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#0077ff] via-[#00a6ff] to-[#00c2ff] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {createLoading ? 'Creating...' : 'Create Lobby'}
            </button>
          </div>

          {/* Join Lobby */}
          <div className="bg-black/35 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-lg text-[#ffb347]">Join Lobby</h3>
            <p className="text-white/50 text-sm">
              Enter a code to join a friend&apos;s game
            </p>
            <input
              type="text"
              placeholder="Lobby code (e.g. AB3X9Y)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#ffb347]/50 text-sm font-mono tracking-widest"
            />
            <input
              type="text"
              placeholder="Your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              maxLength={20}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#ffb347]/50 text-sm"
            />
            <button
              onClick={handleJoin}
              disabled={joinLoading || !joinCode.trim() || !joinName.trim()}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#ff7a18] via-[#ffb347] to-[#ffd080] text-black hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {joinLoading ? 'Joining...' : 'Join Lobby'}
            </button>
          </div>
        </div>

        {/* How to play */}
        <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-3">
          <h3 className="font-bold text-white/80 text-sm uppercase tracking-widest">
            How to Play
          </h3>
          <ol className="space-y-2 text-white/55 text-sm list-decimal list-inside">
            <li>One player creates a lobby and shares the code</li>
            <li>Friends join using the code (up to 8 players)</li>
            <li>Each round, one player is the President (judge)</li>
            <li>
              A nostalgia prompt is shown – submit your best YouTube video
            </li>
            <li>The President picks the winner – they earn a point</li>
            <li>First to reach 5 points wins!</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
