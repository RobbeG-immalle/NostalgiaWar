'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CategorySelector } from '@/components/CategorySelector';
import { VideoCard } from '@/components/VideoCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { VoteBar } from '@/components/VoteBar';
import { useVoting } from '@/hooks/useVoting';

export default function SingleplayerPage() {
  const [category, setCategory] = useState('all');
  const { state, pair, results, error, loadPair, submitVote } = useVoting(category);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
  };

  const isLoading = state === 'loading';
  const showResults = state === 'results';
  const disabled = isLoading || showResults;

  useEffect(() => {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      // AdSense not loaded yet
    }
  }, []);

  function handleReport(itemId: string) {
    const sessionId =
      typeof window !== 'undefined'
        ? (localStorage.getItem('nostalgia_war_session_id') ?? undefined)
        : undefined;

    fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, session_id: sessionId, reason: 'broken' }),
    }).catch(() => null);
  }

  const winnerIsA =
    results && results.itemA.percentage > results.itemB.percentage;
  const winnerIsB =
    results && results.itemB.percentage > results.itemA.percentage;

  return (
    <main className="min-h-screen text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 nw-scanlines opacity-30" />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#080d18]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center mr-auto gap-4">
            <Link
              href="/"
              className="text-white/50 hover:text-white/80 text-sm transition-colors"
            >
              ← Back
            </Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Nostalgia War" className="h-20 w-auto mix-blend-screen" />
          </div>
          <CategorySelector value={category} onChange={handleCategoryChange} />
        </div>
      </div>

      {/* AD: Leaderboard banner */}
      <div className="w-full bg-[#080d18] border-b border-white/5 py-2 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-center">
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-8943487538270573"
            data-ad-slot="LEADERBOARD_SLOT_ID"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Tagline */}
        <div className="text-center space-y-2 relative">
          <h2 className="text-2xl sm:text-3xl font-black text-white/95 nw-glow-text tracking-wide">
            NOSTALGIA WAR
          </h2>
          <p className="text-white/55 text-sm uppercase tracking-[0.2em]">
            Vote for the most nostalgic video
          </p>
        </div>

        {/* Vote bar (shown during results) */}
        {showResults && results && (
          <div className="max-w-xl mx-auto">
            <VoteBar
              leftPercentage={results.itemA.percentage}
              rightPercentage={results.itemB.percentage}
              leftLabel={results.itemA.item.title}
              rightLabel={results.itemB.item.title}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button
              onClick={loadPair}
              className="px-4 py-2 bg-[#ff2d55]/20 hover:bg-[#ff2d55]/30 border border-[#ff2d55]/40 rounded-lg text-sm transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {isLoading && !pair ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : pair ? (
            <>
              <VideoCard
                item={pair.itemA}
                onVote={() => submitVote(pair.itemA.id)}
                onReport={handleReport}
                disabled={disabled}
                isWinner={showResults ? !!winnerIsA : undefined}
                percentage={results?.itemA.percentage}
                showResults={showResults}
              />
              <VideoCard
                item={pair.itemB}
                onVote={() => submitVote(pair.itemB.id)}
                onReport={handleReport}
                disabled={disabled}
                isWinner={showResults ? !!winnerIsB : undefined}
                percentage={results?.itemB.percentage}
                showResults={showResults}
              />
            </>
          ) : null}
        </div>

        {/* AD: Rectangle */}
        <div className="flex justify-center">
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-8943487538270573"
            data-ad-slot="RECTANGLE_SLOT_ID"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>

        {/* VS divider */}
        {!showResults && pair && !isLoading && (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-white/20" />
              <span className="text-[#ffb347] font-black text-sm tracking-[0.35em] nw-glow-text">VS</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-white/20" />
            </div>
          </div>
        )}

        {/* Skip button */}
        {!isLoading && !showResults && (
          <div className="text-center">
            <button
              onClick={loadPair}
              className="text-[#00a6ff]/70 hover:text-[#00a6ff] text-sm transition-colors"
            >
              Skip this pair →
            </button>
          </div>
        )}

        {/* Auto-advance indicator */}
        {showResults && (
          <div className="text-center text-[#00a6ff]/80 text-sm animate-pulse uppercase tracking-[0.2em]">
            Loading next pair...
          </div>
        )}
      </div>
    </main>
  );
}
