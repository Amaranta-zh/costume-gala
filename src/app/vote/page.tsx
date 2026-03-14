'use client'

// /vote — Guest voting page
// Shows finalists, enforces time-lock, prevents double votes

import { useEffect, useState, useCallback } from 'react'
import { supabase, FinalistVoteCount, VotingConfig } from '@/lib/supabase'
import { getFingerprint, getLocalVote, setLocalVote } from '@/lib/fingerprint'

export default function VotePage() {
  const [finalists, setFinalists]   = useState<FinalistVoteCount[]>([])
  const [config, setConfig]         = useState<VotingConfig | null>(null)
  const [votedId, setVotedId]       = useState<string | null>(null)
  const [pendingId, setPendingId]   = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed]   = useState(false)
  const [timeLeft, setTimeLeft]     = useState('')

  // ── Load finalists & voting config ──────────────────────────
  const loadData = useCallback(async () => {
    const [{ data: votes }, { data: cfg }] = await Promise.all([
      supabase.from('finalist_vote_counts').select('*'),
      supabase.from('voting_config').select('*').single(),
    ])
    if (votes) setFinalists(votes)
    if (cfg)   setConfig(cfg)
    setLoading(false)
  }, [])

  // ── Check if guest already voted ────────────────────────────
  useEffect(() => {
    loadData()
    const alreadyVoted = getLocalVote()
    if (alreadyVoted) setVotedId(alreadyVoted)
  }, [loadData])

  // ── Countdown timer ─────────────────────────────────────────
  useEffect(() => {
    if (!config?.ends_at) return
    const tick = () => {
      const diff = new Date(config.ends_at).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Closed'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${h > 0 ? h + ':' : ''}${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [config])

  // ── Real-time vote count updates ────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('votes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' },
        () => loadData() // re-fetch counts when any vote lands
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  // ── Voting window check ──────────────────────────────────────
  const windowIsOpen = config
    ? config.is_open &&
      Date.now() >= new Date(config.starts_at).getTime() &&
      Date.now() <= new Date(config.ends_at).getTime()
    : false

  // ── Submit vote ──────────────────────────────────────────────
  const confirmVote = async () => {
    if (!pendingId || votedId || !windowIsOpen || submitting) return
    setSubmitting(true)
    try {
      const fingerprint = await getFingerprint()
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: pendingId, fingerprint }),
      })
      if (res.status === 409) { // already voted — another device
        const alreadyFor = pendingId
        setVotedId(alreadyFor)
        setLocalVote(alreadyFor)
        setConfirmed(true)
        return
      }
      if (!res.ok) {
        const { error } = await res.json()
        alert(error ?? 'Something went wrong.')
        return
      }
      setVotedId(pendingId)
      setLocalVote(pendingId)
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 3000)
    } finally {
      setSubmitting(false)
      setPendingId(null)
    }
  }

  const maxVotes = Math.max(...finalists.map(f => f.vote_count), 1)

  if (loading) {
    return <div style={styles.loading}>Loading finalists...</div>
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <img src="/logo.png" alt="Logo" className="site-logo" onError={(e) => { (e.target as HTMLImageElement).style.display="none" }} /><span style={styles.brand}>Costume Gala</span>
        <div style={styles.timerWrap}>
          <div style={{ ...styles.dot, background: windowIsOpen ? 'rgba(100,200,130,0.9)' : 'rgba(200,80,80,0.7)' }} />
          <span style={styles.timerLabel}>{windowIsOpen ? 'Closes in' : 'Voting closed'}</span>
          {windowIsOpen && <span style={styles.timerVal}>{timeLeft}</span>}
        </div>
        <span style={styles.countBadge}>{finalists.length} finalists</span>
      </header>

      {/* Status banner */}
      <div style={windowIsOpen ? styles.openBanner : styles.closedBanner}>
        {windowIsOpen
          ? 'Voting is open — cast your vote before 8:00 PM'
          : 'Voting has closed. Results will be announced at the ceremony.'}
      </div>

      {/* Hero */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Vote for Your Favourite Costume</h1>
        <p style={styles.heroSub}>One vote per guest · Results revealed at ceremony</p>
      </div>

      {/* Finalists grid */}
      <div className="vote-grid">
        {finalists.map(f => {
          const isVoted   = votedId === f.id
          const hasVoted  = !!votedId
          const pct       = Math.round((f.vote_count / maxVotes) * 100)
          return (
            <div key={f.id} style={{ ...styles.card, ...(isVoted ? styles.cardVoted : {}) }}>
              {isVoted && <div style={styles.votedBadge}>Your vote</div>}
              <img src={f.photo_url} alt={f.name} style={styles.cardImg} />
              <div style={styles.cardBody}>
                <div style={styles.cardName}>{f.name}</div>
                <div style={styles.cardVotes}>{f.vote_count} vote{f.vote_count !== 1 ? 's' : ''}</div>
                <div style={styles.barWrap}>
                  <div style={{ ...styles.barFill, width: pct + '%', ...(isVoted ? styles.barVoted : {}) }} />
                </div>
                <button
                  style={{
                    ...styles.voteBtn,
                    ...(isVoted ? styles.voteBtnVoted : {}),
                    ...(!windowIsOpen || (hasVoted && !isVoted) ? styles.voteBtnDisabled : {}),
                  }}
                  disabled={!windowIsOpen || (hasVoted && !isVoted) || submitting}
                  onClick={() => { if (!hasVoted && windowIsOpen) setPendingId(f.id) }}
                >
                  {isVoted ? '✓ Your vote' : hasVoted ? 'Voted' : 'Vote'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirmation bottom bar */}
      {pendingId && !votedId && (
        <div style={styles.bottomBar}>
          <div style={styles.bottomMsg}>
            You selected <strong style={{ color: '#c0a062' }}>
              {finalists.find(f => f.id === pendingId)?.name}
            </strong>
            <br />Tap confirm to lock in your vote.
          </div>
          <button style={styles.confirmBtn} onClick={confirmVote} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Confirm vote'}
          </button>
        </div>
      )}

      {/* Confirmed overlay */}
      {confirmed && (
        <div style={styles.overlay}>
          <div style={styles.overlayBox}>
            <div style={styles.checkRing}>✓</div>
            <h2 style={styles.overlayTitle}>Vote Recorded</h2>
            <p style={styles.overlayName}>{finalists.find(f => f.id === votedId)?.name}</p>
            <p style={styles.overlaySub}>Thank you for participating.<br />Results will be announced at the ceremony.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Inline styles (matching the dark formal theme) ────────────
const styles: Record<string, React.CSSProperties> = {
  page:         { background: '#0a0a0f', minHeight: '100vh', fontFamily: 'sans-serif', color: '#e8dfc8', paddingBottom: 120 },
  loading:      { background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(232,223,200,0.4)', fontFamily: 'sans-serif' },
  header:       { background: '#0f0f18', borderBottom: '0.5px solid rgba(192,160,98,0.2)', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' },
  brand:        { fontFamily: 'Georgia, serif', fontSize: '1.2rem', fontWeight: 300, letterSpacing: '0.05em' },
  timerWrap:    { display: 'flex', alignItems: 'center', gap: 8 },
  dot:          { width: 7, height: 7, borderRadius: '50%' },
  timerLabel:   { fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(232,223,200,0.45)' },
  timerVal:     { fontSize: 12, fontWeight: 500, color: '#c0a062', letterSpacing: '0.1em' },
  countBadge:   { fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(232,223,200,0.35)', border: '0.5px solid rgba(192,160,98,0.2)', padding: '3px 10px' },
  openBanner:   { background: '#0d130d', borderBottom: '0.5px solid rgba(100,200,130,0.2)', padding: '10px 2rem', textAlign: 'center' as const, fontSize: 11, letterSpacing: '0.1em', color: 'rgba(100,200,130,0.7)' },
  closedBanner: { background: '#130d0d', borderBottom: '0.5px solid rgba(200,80,80,0.2)', padding: '10px 2rem', textAlign: 'center' as const, fontSize: 11, letterSpacing: '0.1em', color: 'rgba(200,100,100,0.7)' },
  hero:         { padding: '2.5rem 2rem 1rem', textAlign: 'center' as const },
  heroTitle:    { fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 300, letterSpacing: '0.04em', lineHeight: 1.2 },
  heroSub:      { fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'rgba(192,160,98,0.5)', marginTop: '0.5rem' },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1, background: 'rgba(192,160,98,0.07)', margin: '1rem 0' },
  card:         { background: '#0a0a0f', position: 'relative' as const },
  cardVoted:    { background: '#0c100b' },
  cardImg:      { width: '100%', aspectRatio: '3/4', objectFit: 'cover' as const, display: 'block' },
  cardBody:     { padding: '10px 12px 14px' },
  cardName:     { fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  cardVotes:    { fontSize: 10, color: 'rgba(232,223,200,0.3)', letterSpacing: '0.05em', marginTop: 2 },
  barWrap:      { marginTop: 6, height: 2, background: 'rgba(192,160,98,0.08)', borderRadius: 1, overflow: 'hidden' },
  barFill:      { height: '100%', background: 'rgba(192,160,98,0.35)', transition: 'width 0.5s' },
  barVoted:     { background: 'rgba(100,200,130,0.5)' },
  voteBtn:      { width: '100%', marginTop: 8, background: 'transparent', border: '0.5px solid rgba(192,160,98,0.3)', color: 'rgba(192,160,98,0.7)', fontFamily: 'sans-serif', fontSize: 9, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase' as const, padding: 7, cursor: 'pointer', borderRadius: 1 },
  voteBtnVoted: { borderColor: 'rgba(100,200,130,0.4)', color: 'rgba(100,200,130,0.8)', background: 'rgba(100,200,130,0.06)', cursor: 'default' },
  voteBtnDisabled: { opacity: 0.3, cursor: 'not-allowed' },
  votedBadge:   { position: 'absolute' as const, top: 0, left: 0, background: 'rgba(12,20,12,0.9)', borderBottom: '0.5px solid rgba(100,200,130,0.3)', borderRight: '0.5px solid rgba(100,200,130,0.3)', padding: '3px 8px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(100,200,130,0.8)' },
  bottomBar:    { position: 'fixed' as const, bottom: 0, left: 0, right: 0, background: '#0f0f18', borderTop: '0.5px solid rgba(192,160,98,0.2)', padding: '12px 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', zIndex: 50 },
  bottomMsg:    { fontSize: 11, color: 'rgba(232,223,200,0.4)', letterSpacing: '0.05em', lineHeight: 1.5 },
  confirmBtn:   { background: 'transparent', border: '0.5px solid rgba(192,160,98,0.5)', color: '#e8dfc8', fontFamily: 'sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' as const, padding: '9px 22px', cursor: 'pointer', borderRadius: 1 },
  overlay:      { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  overlayBox:   { background: '#13131a', border: '0.5px solid rgba(192,160,98,0.25)', borderRadius: 2, padding: '2.5rem 2rem', textAlign: 'center' as const, width: 320, maxWidth: '90%' },
  checkRing:    { width: 56, height: 56, border: '1px solid rgba(100,200,130,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: 'rgba(100,200,130,0.9)', fontSize: 22 },
  overlayTitle: { fontFamily: 'Georgia, serif', fontSize: '1.6rem', fontWeight: 300, color: '#e8dfc8', marginBottom: '0.5rem' },
  overlayName:  { fontSize: 12, color: 'rgba(192,160,98,0.7)', letterSpacing: '0.08em', marginBottom: '0.4rem' },
  overlaySub:   { fontSize: 11, color: 'rgba(232,223,200,0.3)', letterSpacing: '0.05em', lineHeight: 1.6 },
}
