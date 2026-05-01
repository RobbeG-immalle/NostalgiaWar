import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function checkAuth(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const auth = request.headers.get('Authorization');
  return auth === `Bearer ${adminPassword}`;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
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

  const body = await request.json();
  const { title, youtube_url, category } = body;

  if (!title || !youtube_url || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('items')
    .insert({ title, youtube_url, category })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
