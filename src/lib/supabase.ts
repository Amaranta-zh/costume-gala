import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase instance (uses anon key, safe to use in browser)
export const supabase = createClient(supabaseUrl, supabaseAnon)

// ─── Types ───────────────────────────────────────────────────

export interface Submission {
  id: string
  name: string
  photo_url: string
  is_finalist: boolean
  created_at: string
}

export interface Vote {
  id: string
  submission_id: string
  voter_fingerprint: string
  voted_at: string
}

export interface VotingConfig {
  id: 1
  starts_at: string
  ends_at: string
  is_open: boolean
}

export interface FinalistVoteCount {
  id: string
  name: string
  photo_url: string
  vote_count: number
}
