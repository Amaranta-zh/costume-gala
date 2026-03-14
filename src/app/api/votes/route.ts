// POST /api/votes
// Guest casts a vote — enforces time window + one-vote-per-fingerprint

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { submission_id, fingerprint } = await req.json()

    if (!submission_id || !fingerprint) {
      return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
    }

    // ── 1. Check voting window is open ───────────────────────
    const { data: config, error: configErr } = await supabaseAdmin
      .from('voting_config')
      .select('*')
      .single()

    if (configErr || !config) {
      return NextResponse.json({ error: 'Voting config not found.' }, { status: 500 })
    }

    const now = new Date()
    if (
      !config.is_open ||
      now < new Date(config.starts_at) ||
      now > new Date(config.ends_at)
    ) {
      return NextResponse.json({ error: 'Voting is not currently open.' }, { status: 403 })
    }

    // ── 2. Check target is actually a finalist ───────────────
    const { data: submission, error: subErr } = await supabaseAdmin
      .from('submissions')
      .select('id, is_finalist')
      .eq('id', submission_id)
      .single()

    if (subErr || !submission?.is_finalist) {
      return NextResponse.json({ error: 'Invalid finalist.' }, { status: 400 })
    }

    // ── 3. Mix IP into fingerprint for extra uniqueness ──────
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const combinedFingerprint = `${fingerprint}:${ip}`

    // ── 4. Insert vote (DB unique constraint prevents doubles) 
    const { error: voteErr } = await supabaseAdmin
      .from('votes')
      .insert({ submission_id, voter_fingerprint: combinedFingerprint })

    if (voteErr) {
      if (voteErr.code === '23505') {
        // Unique violation — already voted
        return NextResponse.json({ error: 'You have already voted.' }, { status: 409 })
      }
      throw voteErr
    }

    return NextResponse.json({ ok: true }, { status: 201 })

  } catch (err: any) {
    console.error('[POST /api/votes]', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
