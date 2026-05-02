'use client';

import { useState } from 'react';
import { CategorySelector } from '@/components/CategorySelector';
import { VideoCard } from '@/components/VideoCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { VoteBar } from '@/components/VoteBar';
import { useVoting } from '@/hooks/useVoting';

export default function Home() {
  const [category, setCategory] = useState('all');
  const { state, pair, results, error, loadPair, submitVote } = useVoting(category);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
  };

  const isLoading = state === 'loading';
  const showResults = state === 'results';
  const disabled = isLoading || showResults;

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
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center mr-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Nostalgia War" className="h-12 w-auto" />
          </div>
          <CategorySelector value={category} onChange={handleCategoryChange} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Tagline */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white/90">
            Which hits harder?
          </h2>
          <p className="text-white/40 text-sm">
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
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
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

        {/* VS divider */}
        {!showResults && pair && !isLoading && (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-white/20" />
              <span className="text-white/30 font-bold text-sm tracking-widest">VS</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-white/20" />
            </div>
          </div>
        )}

        {/* Skip button */}
        {!isLoading && !showResults && (
          <div className="text-center">
            <button
              onClick={loadPair}
              className="text-white/30 hover:text-white/60 text-sm transition-colors"
            >
              Skip this pair →
            </button>
          </div>
        )}

        {/* Auto-advance indicator */}
        {showResults && (
          <div className="text-center text-white/30 text-sm animate-pulse">
            Loading next pair...
          </div>
        )}
      </div>
    </main>
  );
}
