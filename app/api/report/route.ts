import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { item_id, session_id, reason } = body as {
    item_id?: string;
    session_id?: string;
    reason?: string;
  };

  if (!item_id) {
    return NextResponse.json({ error: 'Missing item_id' }, { status: 400 });
  }

  const allowedReasons = ['broken', 'incorrect', 'other'];
  const safeReason = allowedReasons.includes(reason ?? '') ? reason : 'broken';

  const { error } = await supabase.from('reports').insert({
    item_id,
    session_id: session_id ?? null,
    reason: safeReason,
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
