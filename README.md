# Costume Gala — Voting System

A full-stack voting system for corporate costume events.
Built with Next.js 14 + Supabase (PostgreSQL + Real-time).

---

## Pages

| Route | Who uses it | Notes |
|-------|-------------|-------|
| `/` | Guests | Upload photo + name |
| `/judge?key=YOUR_KEY` | Judges only | Curate finalists, publish, open/close voting |
| `/vote` | Guests | Vote for finalist (time-locked) |
| `/live` | Big screen display | Real-time leaderboard + vote feed |

---

## Setup Guide

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to Jakarta (Singapore `ap-southeast-1` is ideal)
3. Note your **Project URL** and **API keys** from Settings → API

### 2. Run the database schema

1. In Supabase Dashboard → **SQL Editor** → New Query
2. Paste the contents of `supabase/schema.sql`
3. Click **Run**

### 3. Create the photos storage bucket

1. Supabase Dashboard → **Storage** → New bucket
2. Name it `photos`
3. Set to **Public** (so photo URLs are accessible without auth)
4. Add this policy under Storage → Policies:
   - Allow anonymous uploads: `INSERT` to `anon` with `true` condition

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
# Then fill in your values:
```

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `JUDGE_SECRET_KEY` | Make up any secret string |

### 5. Install and run locally

```bash
npm install
npm run dev
```

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
# Follow prompts, then add env vars in Vercel dashboard
```

Or connect your GitHub repo to Vercel for automatic deploys.

---

## Event Day Checklist

### Before the event
- [ ] Deploy to Vercel, test all 4 pages
- [ ] Share `/` link with all guests (e.g. via QR code at entrance)
- [ ] Open `/judge?key=YOUR_KEY` on judge laptops
- [ ] Open `/live` on the big screen (fullscreen mode: F11)

### During the event
- [ ] Guests upload photos on arrival via their phones
- [ ] Judges use the panel to select finalists — no cap, choose as many as needed
- [ ] When ready, judges click **Publish finalists** in the panel
- [ ] At voting time (6 PM), judges click **Open voting** in the panel
  - Or set `is_open = true` in Supabase directly as a backup
- [ ] At 8 PM, judges click **Close voting**

### Voting window override (emergency)
If you need to manually open/close voting, run this in Supabase SQL Editor:
```sql
-- Open voting
UPDATE voting_config SET is_open = true WHERE id = 1;

-- Close voting
UPDATE voting_config SET is_open = false WHERE id = 1;

-- Change the window time
UPDATE voting_config
SET starts_at = '2025-04-07 18:00:00+07',
    ends_at   = '2025-04-07 20:00:00+07'
WHERE id = 1;
```

---

## Anti-Double-Vote Strategy

Votes are prevented at two layers:

1. **Browser fingerprint** (FingerprintJS) — hashed with the guest's IP address, stored as `voter_fingerprint` with a `UNIQUE` constraint in the database
2. **localStorage** — fast client-side check before hitting the server

A determined guest on multiple devices could bypass this, but for a corporate event this is more than sufficient. The database constraint is the hard guarantee.

---

## Architecture

```
Guest phone  ──→  / (upload)     ──→  /api/submissions  ──→  Supabase Storage + DB
Judge laptop ──→  /judge?key=    ──→  /api/finalists     ──→  Supabase DB
Guest phone  ──→  /vote          ──→  /api/votes         ──→  Supabase DB
Big screen   ──→  /live          ──→  Supabase Realtime  (websocket, no polling)
```

Real-time flow: when a vote is inserted → Supabase NOTIFY → websocket push to `/live` and `/vote` → UI updates instantly.

---

## File Structure

```
costume-gala/
├── supabase/
│   └── schema.sql              ← Run this first in Supabase
├── src/
│   ├── lib/
│   │   ├── supabase.ts         ← DB client + TypeScript types
│   │   └── fingerprint.ts      ← Anti-double-vote fingerprint util
│   └── app/
│       ├── page.tsx            ← Guest upload page (/)
│       ├── vote/page.tsx       ← Voting page (/vote)
│       ├── live/page.tsx       ← Live screen (/live)
│       ├── judge/page.tsx      ← Judge curation panel (/judge)
│       └── api/
│           ├── submissions/route.ts   ← POST: guest photo upload
│           ├── votes/route.ts         ← POST: cast a vote
│           ├── finalists/route.ts     ← GET/POST/PATCH: judge actions
│           └── voting-config/route.ts ← GET: window status
├── .env.local.example          ← Copy to .env.local and fill in
├── package.json
└── README.md
```
