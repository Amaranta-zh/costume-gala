// GET  /api/finalists  — fetch all submissions (judge panel)
// POST /api/finalists  — update finalist selection
// PATCH /api/finalists — toggle voting window open/closed

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const JUDGE_KEY = process.env.JUDGE_SECRET_KEY ?? 'change-me'

function checkJudgeKey(req: NextRequest): boolean {
  const key = req.nextUrl.searchParams.get('key')
  return key === JUDGE_KEY
}

export async function GET(req: NextRequest) {
  if (!checkJudgeKey(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('id, name, photo_url, is_finalist, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submissions: data })
}

export async function POST(req: NextRequest) {
  if (!checkJudgeKey(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  const { finalist_ids } = await req.json()
  if (!Array.isArray(finalist_ids)) {
    return NextResponse.json({ error: 'finalist_ids must be an array.' }, { status: 400 })
  }
  const { error: resetErr } = await supabaseAdmin
    .from('submissions')
    .update({ is_finalist: false })
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 500 })
  if (finalist_ids.length > 0) {
    const { error: setErr } = await supabaseAdmin
      .from('submissions')
      .update({ is_finalist: true })
      .in('id', finalist_ids)
    if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, count: finalist_ids.length })
}

export async function PATCH(req: NextRequest) {
  if (!checkJudgeKey(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  const body = await req.json()
  const opening = Boolean(body.is_open)
  const durationMinutes = Number(body.duration_minutes) || 120
  const updatePayload: Record<string, unknown> = { is_open: opening }
  if (opening) {
    const now = new Date()
    const end = new Date(now.getTime() + durationMinutes * 60 * 1000)
    updatePayload.starts_at = now.toISOString()
    updatePayload.ends_at = end.toISOString()
  }
  const { error } = await supabaseAdmin
    .from('voting_config')
    .update(updatePayload)
    .eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, is_open: opening })
}
