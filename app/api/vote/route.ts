import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_a_id, item_b_id, voted_item_id, session_id } = body;

    if (!item_a_id || !item_b_id || !voted_item_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for duplicate vote from this session for this pair
    if (session_id) {
      const { data: existing } = await supabase
        .from('votes')
        .select('id')
        .eq('session_id', session_id)
        .or(`and(item_a_id.eq.${item_a_id},item_b_id.eq.${item_b_id}),and(item_a_id.eq.${item_b_id},item_b_id.eq.${item_a_id})`)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'Already voted on this pair' }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('votes')
      .insert({ item_a_id, item_b_id, voted_item_id, session_id })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error submitting vote:', error);
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
  }
}
