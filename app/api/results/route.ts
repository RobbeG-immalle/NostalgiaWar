import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { VoteResult } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const itemAId = searchParams.get('item_a_id');
  const itemBId = searchParams.get('item_b_id');

  if (!itemAId || !itemBId) {
    return NextResponse.json({ error: 'Missing item IDs' }, { status: 400 });
  }

  try {
    const [itemARes, itemBRes, votesRes] = await Promise.all([
      supabase.from('items').select('*').eq('id', itemAId).single(),
      supabase.from('items').select('*').eq('id', itemBId).single(),
      supabase
        .from('votes')
        .select('voted_item_id')
        .or(`and(item_a_id.eq.${itemAId},item_b_id.eq.${itemBId}),and(item_a_id.eq.${itemBId},item_b_id.eq.${itemAId})`),
    ]);

    if (itemARes.error) throw itemARes.error;
    if (itemBRes.error) throw itemBRes.error;
    if (votesRes.error) throw votesRes.error;

    const votes = votesRes.data || [];
    const votesForA = votes.filter((v) => v.voted_item_id === itemAId).length;
    const votesForB = votes.filter((v) => v.voted_item_id === itemBId).length;
    const total = votes.length;

    const result: VoteResult = {
      itemA: {
        item: itemARes.data,
        votes: votesForA,
        percentage: total > 0 ? Math.round((votesForA / total) * 100) : 0,
      },
      itemB: {
        item: itemBRes.data,
        votes: votesForB,
        percentage: total > 0 ? Math.round((votesForB / total) * 100) : 0,
      },
      total,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
