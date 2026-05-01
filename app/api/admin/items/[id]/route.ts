import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkAuth } from '@/lib/adminAuth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing' },
      { status: 500 }
    );
  }

  const { id } = await params;

  // Remove all votes that reference this item before deleting it
  const { error: votesError } = await supabaseAdmin
    .from('votes')
    .delete()
    .or(`item_a_id.eq.${id},item_b_id.eq.${id}`);

  if (votesError) {
    return NextResponse.json({ error: 'Failed to remove associated votes' }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from('items').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
