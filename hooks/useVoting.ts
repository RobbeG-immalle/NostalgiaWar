'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pair, VoteResult } from '@/lib/types';

type VotingState = 'loading' | 'voting' | 'results';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = localStorage.getItem('nostalgia_war_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('nostalgia_war_session_id', sessionId);
  }
  return sessionId;
}

export function useVoting(category: string) {
  const [state, setState] = useState<VotingState>('loading');
  const [pair, setPair] = useState<Pair | null>(null);
  const [results, setResults] = useState<VoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPairKey, setLastPairKey] = useState<string>('');

  const loadPair = useCallback(async () => {
    setState('loading');
    setResults(null);
    setError(null);
    try {
      const params = new URLSearchParams({ category });
      if (lastPairKey) params.set('exclude', lastPairKey);
      const res = await fetch(`/api/pair?${params}`);
      if (!res.ok) throw new Error('Failed to load pair');
      const data: Pair = await res.json();
      setPair(data);
      setLastPairKey(`${data.itemA.id}-${data.itemB.id}`);
      setState('voting');
    } catch {
      setError('Failed to load videos. Please try again.');
      setState('voting');
    }
  }, [category, lastPairKey]);

  useEffect(() => {
    loadPair();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const submitVote = useCallback(
    async (votedItemId: string) => {
      if (!pair || state !== 'voting') return;
      setState('loading');

      try {
        const sessionId = getSessionId();

        await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_a_id: pair.itemA.id,
            item_b_id: pair.itemB.id,
            voted_item_id: votedItemId,
            session_id: sessionId,
          }),
        });

        const resultsRes = await fetch(
          `/api/results?item_a_id=${pair.itemA.id}&item_b_id=${pair.itemB.id}`
        );
        if (!resultsRes.ok) throw new Error('Failed to fetch results');
        const resultsData: VoteResult = await resultsRes.json();
        setResults(resultsData);
        setState('results');

        setTimeout(() => {
          loadPair();
        }, 2000);
      } catch {
        setError('Failed to submit vote. Please try again.');
        setState('voting');
      }
    },
    [pair, state, loadPair]
  );

  return { state, pair, results, error, loadPair, submitVote };
}
