import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkAuth } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing' },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('reports')
    .select('item_id, reason, items(id, title, youtube_url, category)')
    .order('item_id');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }

  // Aggregate by item_id
  const map = new Map<
    string,
    { item: { id: string; title: string; youtube_url: string; category: string }; count: number }
  >();

  for (const row of data ?? []) {
    const rawItem = row.items as unknown;
    const item = Array.isArray(rawItem)
      ? (rawItem[0] as { id: string; title: string; youtube_url: string; category: string } | undefined)
      : (rawItem as { id: string; title: string; youtube_url: string; category: string } | null);

    if (!item) continue;

    const existing = map.get(item.id);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(item.id, { item, count: 1 });
    }
  }

  const result = Array.from(map.values()).sort((a, b) => b.count - a.count);

  return NextResponse.json(result);
}
