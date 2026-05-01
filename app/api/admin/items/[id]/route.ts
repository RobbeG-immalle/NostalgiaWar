import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function checkAuth(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const auth = request.headers.get('Authorization');
  return auth === `Bearer ${adminPassword}`;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Remove all votes that reference this item before deleting it
  const { error: votesError } = await supabase
    .from('votes')
    .delete()
    .or(`item_a_id.eq.${id},item_b_id.eq.${id}`);

  if (votesError) {
    return NextResponse.json({ error: 'Failed to remove associated votes' }, { status: 500 });
  }

  const { error } = await supabase.from('items').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
