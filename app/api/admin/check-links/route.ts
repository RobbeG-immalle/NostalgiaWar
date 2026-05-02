import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkAuth } from '@/lib/adminAuth';

async function isYoutubeAvailable(url: string): Promise<boolean> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

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
    .from('items')
    .select('id, title, youtube_url, category');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }

  const items = data ?? [];

  const results = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      title: item.title,
      youtube_url: item.youtube_url,
      category: item.category,
      available: await isYoutubeAvailable(item.youtube_url),
    }))
  );

  const broken = results.filter((item) => !item.available);

  return NextResponse.json({ broken, total: items.length });
}
