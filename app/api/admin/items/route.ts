import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkAuth } from '@/lib/adminAuth';

type AdminItemInput = {
  title?: string;
  youtube_url?: string;
  category?: string;
};

type BulkInsertResponse = {
  inserted: Array<{
    id: string;
    title: string;
    youtube_url: string;
    category: string;
  }>;
  skipped: Array<{
    title: string;
    youtube_url: string;
    category: string;
    reason: string;
  }>;
};

const CATEGORY_ALIASES: Record<string, string> = {
  'video games': 'video_games',
  video_games: 'video_games',
  videogames: 'video_games',
  cartoons: 'cartoons',
  movies: 'movies',
  music: 'music',
};

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeCategory(category: string): string | null {
  const normalized = category.trim().toLowerCase().replace(/[_-]+/g, ' ');
  return CATEGORY_ALIASES[normalized] ?? null;
}

function getYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace(/^\//, '') || null;
    }

    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }

    return null;
  } catch {
    return null;
  }
}

function getDuplicateKeys(item: { title: string; youtube_url: string; category: string }): string[] {
  const keys = [`title:${item.category}:${normalizeText(item.title)}`];
  const videoId = getYoutubeVideoId(item.youtube_url);

  if (videoId) {
    keys.push(`youtube:${videoId}`);
  } else {
    keys.push(`url:${item.youtube_url.trim().toLowerCase()}`);
  }

  return keys;
}

function sanitizeItem(input: AdminItemInput):
  | { item: { title: string; youtube_url: string; category: string } }
  | { error: string } {
  const title = input.title?.trim() ?? '';
  const youtubeUrl = input.youtube_url?.trim() ?? '';
  const rawCategory = input.category?.trim() ?? '';

  if (!title || !youtubeUrl || !rawCategory) {
    return { error: 'Missing required fields' };
  }

  const category = normalizeCategory(rawCategory);
  if (!category) {
    return { error: `Unsupported category: ${rawCategory}` };
  }

  try {
    const parsed = new URL(youtubeUrl);
    if (!parsed.protocol.startsWith('http')) {
      return { error: 'Invalid YouTube URL' };
    }
  } catch {
    return { error: 'Invalid YouTube URL' };
  }

  return { item: { title, youtube_url: youtubeUrl, category } };
}

async function buildExistingKeys() {
  if (!supabaseAdmin) {
    return { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing' } as const;
  }

  const { data, error } = await supabaseAdmin.from('items').select('title, youtube_url, category');
  if (error) {
    return { error: 'Failed to load existing items' } as const;
  }

  const keys = new Set<string>();
  for (const item of data ?? []) {
    for (const key of getDuplicateKeys(item)) {
      keys.add(key);
    }
  }

  return { keys } as const;
}

async function insertItems(inputs: AdminItemInput[]): Promise<
  | { error: string }
  | BulkInsertResponse
> {
  const existing = await buildExistingKeys();
  if ('error' in existing) {
    return { error: existing.error ?? 'Failed to load existing items' };
  }

  const pendingKeys = existing.keys;
  const itemsToInsert: Array<{ title: string; youtube_url: string; category: string }> = [];
  const skipped: BulkInsertResponse['skipped'] = [];

  for (const input of inputs) {
    const sanitized = sanitizeItem(input);
    if ('error' in sanitized) {
      skipped.push({
        title: input.title?.trim() ?? '',
        youtube_url: input.youtube_url?.trim() ?? '',
        category: input.category?.trim() ?? '',
        reason: sanitized.error,
      });
      continue;
    }

    const duplicateKey = getDuplicateKeys(sanitized.item).find((key) => pendingKeys.has(key));
    if (duplicateKey) {
      skipped.push({ ...sanitized.item, reason: 'Duplicate item' });
      continue;
    }

    itemsToInsert.push(sanitized.item);
    for (const key of getDuplicateKeys(sanitized.item)) {
      pendingKeys.add(key);
    }
  }

  if (itemsToInsert.length === 0) {
    return { inserted: [], skipped };
  }

  const { data, error } = await supabaseAdmin!
    .from('items')
    .insert(itemsToInsert)
    .select('id, title, youtube_url, category');

  if (error) {
    return { error: 'Failed to add item' };
  }

  return { inserted: data ?? [], skipped };
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
    .select('*')
    .order('category')
    .order('title');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const inputs = Array.isArray(body?.items) ? body.items : [body];
  const result = await insertItems(inputs);

  if ('error' in result) {
    const status = result.error === 'Failed to add item' || result.error === 'Failed to load existing items' ? 500 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  if (!Array.isArray(body?.items)) {
    if (result.inserted.length === 1) {
      return NextResponse.json(result.inserted[0], { status: 201 });
    }

    const skippedReason = result.skipped[0]?.reason ?? 'Duplicate item';
    return NextResponse.json({ error: skippedReason }, { status: 409 });
  }

  return NextResponse.json(result, { status: 201 });
}
