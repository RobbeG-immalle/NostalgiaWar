import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
