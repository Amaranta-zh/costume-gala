// GET /api/voting-config — public, used by voting page to check if window is open

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const revalidate = 0 // never cache — always fresh

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('voting_config')
    .select('is_open, starts_at, ends_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = new Date()
  const windowOpen =
    data.is_open &&
    now >= new Date(data.starts_at) &&
    now <= new Date(data.ends_at)

  return NextResponse.json({
    is_open:   windowOpen,
    starts_at: data.starts_at,
    ends_at:   data.ends_at,
  })
}
