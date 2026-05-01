import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Item, Pair } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';
  const excludePairKey = searchParams.get('exclude') || '';

  try {
    let query = supabase.from('items').select('*');
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length < 2) {
      return NextResponse.json({ error: 'Not enough items' }, { status: 404 });
    }

    const items: Item[] = data;
    let attempts = 0;
    let itemA: Item, itemB: Item;

    do {
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      itemA = shuffled[0];
      itemB = shuffled[1];
      attempts++;
    } while (
      attempts < 10 &&
      excludePairKey &&
      (excludePairKey === `${itemA.id}-${itemB.id}` ||
        excludePairKey === `${itemB.id}-${itemA.id}`)
    );

    const pair: Pair = { itemA, itemB };
    return NextResponse.json(pair);
  } catch (error) {
    console.error('Error fetching pair:', error);
    return NextResponse.json({ error: 'Failed to fetch pair' }, { status: 500 });
  }
}
