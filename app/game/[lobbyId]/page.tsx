'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Lobby, Player, Round, Submission } from '@/lib/party-types';

// ─── helpers ────────────────────────────────────────────────────────────────

function getYouTubeEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    let id = '';
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      id = u.searchParams.get('v') ?? '';
    } else if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1);
    }
    return id
      ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
      : url;
  } catch {
    return url;
  }
}

function isValidYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      return !!u.searchParams.get('v');
    }
    if (u.hostname === 'youtu.be') return u.pathname.length > 1;
    return false;
  } catch {
    return false;
  }
}

const SUBMIT_SECONDS = 60;

// ─── component ──────────────────────────────────────────────────────────────

export default function GamePage() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const router = useRouter();

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [judging, setJudging] = useState(false);
  const [chosenWinnerId, setChosenWinnerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [timer, setTimer] = useState(SUBMIT_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── initial load ──────────────────────────────────────────────────────────

  const loadGame = useCallback(async () => {
    const { data: lobbyData } = await supabase
      .from('lobbies')
      .select('*')
      .eq('id', lobbyId)
      .maybeSingle();

    if (!lobbyData) {
      setLoading(false);
      return;
    }
    setLobby(lobbyData as Lobby);

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('lobby_id', lobbyId)
      .order('joined_at', { ascending: true });
    setPlayers((playersData as Player[]) ?? []);

    // Most-recent non-finished round
    const { data: roundData } = await supabase
      .from('rounds')
      .select('*')
      .eq('lobby_id', lobbyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (roundData) {
      setRound(roundData as Round);
      const { data: subData } = await supabase
        .from('submissions')
        .select('*')
        .eq('round_id', roundData.id);
      setSubmissions((subData as Submission[]) ?? []);
    }

    setLoading(false);
  }, [lobbyId]);

  useEffect(() => {
    const pid = localStorage.getItem('party_player_id');
    setMyPlayerId(pid);
    loadGame();
  }, [loadGame]);

  // ── countdown timer ───────────────────────────────────────────────────────

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (round?.status === 'submitting') {
      setTimer(SUBMIT_SECONDS);
      timerRef.current = setInterval(() => {
        setTimer((t) => Math.max(0, t - 1));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.id, round?.status]);

  // ── realtime subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    if (!lobbyId) return;

    const channel = supabase
      .channel(`game:${lobbyId}`)
      // New submission
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'submissions',
        },
        (payload) => {
          const sub = payload.new as Submission;
          if (sub.round_id === round?.id) {
            setSubmissions((prev) => {
              if (prev.some((s) => s.id === sub.id)) return prev;
              return [...prev, sub];
            });
          }
        }
      )
      // Round status changed (submitting → judging, judging → finished)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rounds',
        },
        (payload) => {
          const updated = payload.new as Round;
          if (updated.lobby_id === lobbyId) {
            setRound(updated);
          }
        }
      )
      // New round created
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rounds',
        },
        (payload) => {
          const newRound = payload.new as Round;
          if (newRound.lobby_id === lobbyId) {
            setRound(newRound);
            setSubmissions([]);
            setYoutubeUrl('');
            setChosenWinnerId(null);
            setError('');
          }
        }
      )
      // Player score update
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
        },
        (payload) => {
          const updated = payload.new as Player;
          if (updated.lobby_id === lobbyId) {
            setPlayers((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            );
          }
        }
      )
      // Lobby status changed (playing → finished)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lobbies',
        },
        (payload) => {
          const updated = payload.new as Lobby;
          if (updated.id === lobbyId) {
            setLobby(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, round?.id]);

  // ── actions ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!round || !myPlayerId || !isValidYouTubeUrl(youtubeUrl)) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/party/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: round.id,
          playerId: myPlayerId,
          youtubeUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJudge(winnerId: string) {
    if (!round || !myPlayerId || judging) return;
    setJudging(true);
    setError('');
    try {
      const res = await fetch('/api/party/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: round.id,
          presidentId: myPlayerId,
          winnerId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChosenWinnerId(winnerId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to judge');
    } finally {
      setJudging(false);
    }
  }

  // ── derived state ─────────────────────────────────────────────────────────

  const me = players.find((p) => p.id === myPlayerId);
  const president = players.find((p) => p.id === round?.president_id);
  const isPresident = myPlayerId === round?.president_id;
  const mySubmission = submissions.find((s) => s.player_id === myPlayerId);
  const hasSubmitted = !!mySubmission;

  // ── loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center">
        <div className="text-white/50 animate-pulse text-lg">
          Loading game...
        </div>
      </main>
    );
  }

  // ── game over ─────────────────────────────────────────────────────────────

  if (lobby?.status === 'finished') {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const isWinner = winner?.id === myPlayerId;

    return (
      <main className="min-h-screen text-white relative overflow-hidden flex flex-col items-center justify-center px-4">
        <div className="pointer-events-none absolute inset-0 nw-scanlines opacity-30" />

        <div className="text-center space-y-6 max-w-md w-full">
          <div className="text-6xl">{isWinner ? '🏆' : '🎉'}</div>
          <h1 className="text-4xl font-black nw-glow-text">
            {isWinner ? 'YOU WIN!' : 'GAME OVER'}
          </h1>
          <p className="text-white/60 text-lg">
            {winner?.name} wins with {winner?.score} point
            {winner?.score !== 1 ? 's' : ''}!
          </p>

          {/* Final scoreboard */}
          <div className="bg-black/35 border border-white/10 rounded-2xl p-4 space-y-2">
            {sorted.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 py-2 px-3 rounded-xl ${
                  i === 0
                    ? 'bg-[#ffb347]/10 border border-[#ffb347]/20'
                    : 'bg-white/5'
                }`}
              >
                <span className="text-white/40 text-sm w-6">{i + 1}.</span>
                <span className="flex-1 text-sm font-medium">{p.name}</span>
                <span
                  className={`font-bold text-sm ${
                    i === 0 ? 'text-[#ffb347]' : 'text-white/60'
                  }`}
                >
                  {p.score} pt{p.score !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/multiplayer"
            className="block w-full py-3 rounded-xl bg-gradient-to-r from-[#0077ff] to-[#00c2ff] text-white font-bold text-center hover:brightness-110 transition-all"
          >
            Play Again
          </Link>
        </div>
      </main>
    );
  }

  // ── game UI ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 nw-scanlines opacity-30" />

      {/* Header with scores */}
      <div className="sticky top-0 z-10 bg-[#080d18]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 overflow-x-auto">
          <span className="text-xs font-black nw-glow-text tracking-wide whitespace-nowrap shrink-0">
            NW PARTY
          </span>
          <div className="flex-1 flex items-center gap-2 overflow-x-auto">
            {[...players]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs whitespace-nowrap shrink-0 ${
                    p.id === myPlayerId
                      ? 'bg-[#00a6ff]/15 border border-[#00a6ff]/30'
                      : 'bg-white/5'
                  }`}
                >
                  {p.id === round?.president_id && (
                    <span className="text-[#ffb347]">👑</span>
                  )}
                  <span className="font-medium">{p.name}</span>
                  <span className="text-[#ffb347] font-bold">{p.score}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Role badge */}
        <div className="text-center">
          {isPresident ? (
            <div className="inline-flex items-center gap-2 bg-[#ffb347]/15 border border-[#ffb347]/30 rounded-full px-4 py-2">
              <span className="text-[#ffb347] font-bold text-sm">
                👑 You are the President (Judge)
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
              <span className="text-white/60 text-sm">
                👤 Player –{' '}
                <span className="text-[#00a6ff]">{president?.name}</span> is
                the President
              </span>
            </div>
          )}
        </div>

        {/* Prompt */}
        {round && (
          <div className="text-center bg-black/35 border border-white/10 rounded-2xl p-6 space-y-2">
            <p className="text-white/40 text-xs uppercase tracking-[0.2em]">
              This Round&apos;s Prompt
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white/95 nw-glow-text">
              {round.prompt}
            </h2>
          </div>
        )}

        {error && (
          <div className="bg-[#ff2d55]/10 border border-[#ff2d55]/30 rounded-xl p-3 text-center text-[#ff2d55] text-sm">
            {error}
          </div>
        )}

        {/* ── SUBMITTING PHASE ── */}
        {round?.status === 'submitting' && (
          <div className="space-y-4">
            {/* Timer */}
            <div className="flex items-center justify-center">
              {timer > 0 ? (
                <span
                  className={`text-sm font-mono ${
                    timer <= 10
                      ? 'text-[#ff2d55] animate-pulse'
                      : 'text-white/50'
                  }`}
                >
                  ⏱ {timer}s remaining
                </span>
              ) : (
                <span className="text-sm font-mono text-[#ff2d55] animate-pulse">
                  ⏱ Time&apos;s up! Waiting for remaining submissions...
                </span>
              )}
            </div>

            {isPresident ? (
              <div className="bg-black/35 border border-[#ffb347]/20 rounded-2xl p-6 text-center space-y-2">
                <p className="text-[#ffb347] font-semibold">
                  You are the President!
                </p>
                <p className="text-white/50 text-sm">
                  Wait for the other players to submit their videos, then judge
                  them.
                </p>
                <p className="text-white/40 text-xs mt-1">
                  Submissions: {submissions.length} / {players.length - 1}
                </p>
              </div>
            ) : hasSubmitted ? (
              <div className="bg-black/35 border border-white/10 rounded-2xl p-6 text-center space-y-3">
                <div className="text-3xl">✅</div>
                <p className="text-white/70 font-semibold">Video submitted!</p>
                <p className="text-white/40 text-sm">
                  Waiting for others... ({submissions.length}/
                  {players.length - 1} submitted)
                </p>
                {mySubmission && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
                    <div className="relative w-full aspect-video bg-black">
                      <iframe
                        src={getYouTubeEmbedUrl(mySubmission.youtube_url)}
                        className="absolute inset-0 w-full h-full"
                        allowFullScreen
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                        title="Your submission"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-black/35 border border-white/10 rounded-2xl p-6 space-y-4">
                <p className="text-white/70 text-sm font-medium">
                  Submit your best YouTube video for this prompt:
                </p>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#00a6ff]/50 text-sm"
                />
                {youtubeUrl && !isValidYouTubeUrl(youtubeUrl) && (
                  <p className="text-[#ff2d55] text-xs">
                    Please enter a valid YouTube URL
                  </p>
                )}
                {/* Live preview */}
                {isValidYouTubeUrl(youtubeUrl) && (
                  <div className="rounded-xl overflow-hidden border border-white/10">
                    <div className="relative w-full aspect-video bg-black">
                      <iframe
                        src={getYouTubeEmbedUrl(youtubeUrl)}
                        className="absolute inset-0 w-full h-full"
                        allowFullScreen
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                        title="Preview"
                      />
                    </div>
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !isValidYouTubeUrl(youtubeUrl)}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#0077ff] via-[#00a6ff] to-[#00c2ff] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? 'Submitting...' : '🎵 Submit Video'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── JUDGING PHASE ── */}
        {round?.status === 'judging' && (
          <div className="space-y-4">
            {isPresident ? (
              <>
                <div className="text-center space-y-1">
                  <p className="text-[#ffb347] font-semibold text-lg">
                    👑 Pick the winner!
                  </p>
                  <p className="text-white/50 text-sm">
                    Watch the videos and choose the best one
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {submissions.map((sub) => {
                    const submitter = players.find(
                      (p) => p.id === sub.player_id
                    );
                    const isChosen = chosenWinnerId === sub.player_id;
                    return (
                      <div
                        key={sub.id}
                        className={`flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 ${
                          isChosen
                            ? 'border-[#ffb347] shadow-lg shadow-[#ffb347]/20'
                            : 'border-white/10'
                        } bg-black/35`}
                      >
                        <div className="relative w-full aspect-video bg-black">
                          <iframe
                            src={getYouTubeEmbedUrl(sub.youtube_url)}
                            className="absolute inset-0 w-full h-full"
                            allowFullScreen
                            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                            title={`Submission by ${submitter?.name}`}
                          />
                        </div>
                        <div className="p-4 space-y-3">
                          <p className="text-white/70 text-sm">
                            Submitted by{' '}
                            <span className="font-semibold text-white">
                              {submitter?.name}
                            </span>
                          </p>
                          {chosenWinnerId ? (
                            <div
                              className={`w-full py-2 text-center rounded-xl text-sm font-semibold ${
                                isChosen
                                  ? 'bg-[#ffb347]/20 text-[#ffb347]'
                                  : 'bg-white/5 text-white/30'
                              }`}
                            >
                              {isChosen ? '🏆 Winner!' : '—'}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleJudge(sub.player_id)}
                              disabled={judging}
                              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#ff7a18] via-[#ffb347] to-[#ffd080] text-black hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all"
                            >
                              {judging ? '...' : '👑 Choose as Winner'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-black/35 border border-white/10 rounded-2xl p-6 text-center space-y-4">
                <div className="text-3xl animate-pulse">⚖️</div>
                <p className="text-white/70 font-semibold text-lg">
                  Judging time!
                </p>
                <p className="text-white/40 text-sm">
                  <span className="text-[#ffb347]">{president?.name}</span> is
                  watching the videos and picking a winner...
                </p>

                {/* Show submissions for non-president viewers */}
                {submissions.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 text-left">
                    {submissions.map((sub) => {
                      const submitter = players.find(
                        (p) => p.id === sub.player_id
                      );
                      return (
                        <div
                          key={sub.id}
                          className="rounded-xl overflow-hidden border border-white/10 bg-black/20"
                        >
                          <div className="relative w-full aspect-video bg-black">
                            <iframe
                              src={getYouTubeEmbedUrl(sub.youtube_url)}
                              className="absolute inset-0 w-full h-full"
                              allowFullScreen
                              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                              title={`Submission by ${submitter?.name}`}
                            />
                          </div>
                          <div className="px-3 py-2">
                            <p className="text-white/50 text-xs">
                              by{' '}
                              <span className="text-white/80">
                                {submitter?.name}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ROUND FINISHED (brief) ── */}
        {round?.status === 'finished' && (
          <div className="bg-black/35 border border-white/10 rounded-2xl p-6 text-center space-y-2">
            <div className="text-3xl animate-pulse">🔄</div>
            <p className="text-white/60">Round finished – next round loading...</p>
          </div>
        )}

        {/* ── SCOREBOARD ── */}
        <div className="bg-black/20 border border-white/5 rounded-2xl p-4">
          <h3 className="text-white/50 text-xs uppercase tracking-[0.2em] mb-3">
            Scoreboard
          </h3>
          <div className="space-y-1.5">
            {[...players]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 py-1.5 px-3 rounded-lg ${
                    p.id === myPlayerId ? 'bg-[#00a6ff]/10' : ''
                  }`}
                >
                  <span className="text-white/30 text-xs w-4">{i + 1}</span>
                  <span className="flex-1 text-sm truncate">{p.name}</span>
                  {p.id === round?.president_id && (
                    <span className="text-[#ffb347] text-xs">👑</span>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-16">
                      <div
                        className="h-full bg-[#00a6ff] rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            ((p.score / (lobby?.max_score ?? 5)) * 100).toFixed(
                              0
                            )
                          }%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-xs font-bold w-8 text-right ${
                        p.id === myPlayerId
                          ? 'text-[#00a6ff]'
                          : 'text-white/50'
                      }`}
                    >
                      {p.score}/{lobby?.max_score ?? 5}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <p className="text-white/25 text-xs text-center mt-3">
            First to {lobby?.max_score ?? 5} points wins
          </p>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/multiplayer"
            className="text-white/25 hover:text-white/50 text-xs transition-colors"
          >
            Leave game
          </Link>
        </div>
      </div>
    </main>
  );
}
