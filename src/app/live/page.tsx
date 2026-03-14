'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, FinalistVoteCount } from '@/lib/supabase'

interface FeedItem { id: string; name: string; photo_url: string; time: string }

export default function LiveScreen() {
  const [finalists, setFinalists]     = useState<FinalistVoteCount[]>([])
  const [feed, setFeed]               = useState<FeedItem[]>([])
  const [flashId, setFlashId]         = useState<string | null>(null)
  const [totalVotes, setTotalVotes]   = useState(0)
  const [loading, setLoading]         = useState(true)
  const leaderRef                     = useRef<string | null>(null)
  const [leader, setLeader]           = useState<FinalistVoteCount | null>(null)

  const loadFinalists = useCallback(async () => {
    const { data } = await supabase
      .from('finalist_vote_counts').select('*').order('vote_count', { ascending: false })
    if (data) {
      setFinalists(data)
      setTotalVotes(data.reduce((a, f) => a + f.vote_count, 0))
      if (data[0] && data[0].id !== leaderRef.current) {
        leaderRef.current = data[0].id
        setLeader(data[0])
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadFinalists() }, [loadFinalists])

  useEffect(() => {
    const channel = supabase.channel('live-screen')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, async (payload) => {
        const { data: sub } = await supabase
          .from('submissions').select('id, name, photo_url')
          .eq('id', payload.new.submission_id).single()
        if (sub) {
          setFlashId(sub.id); setTimeout(() => setFlashId(null), 600)
          const now = new Date()
          const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
          setFeed(prev => [{ id:`${sub.id}-${Date.now()}`, name:sub.name, photo_url:sub.photo_url, time }, ...prev].slice(0, 40))
        }
        await loadFinalists()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadFinalists])

  const sorted    = [...finalists].sort((a, b) => b.vote_count - a.vote_count)
  const maxVotes  = sorted[0]?.vote_count || 1

  if (loading) return (
    <div style={{ background:'#06060d', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(232,223,200,0.3)', fontFamily:'sans-serif' }}>
      Loading...
    </div>
  )

  return (
    <div style={{ background:'#06060d', minHeight:'100vh', fontFamily:'sans-serif', color:'#e8dfc8', display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes slideIn  { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }

        .live-header {
          background: #0a0a12;
          border-bottom: 0.5px solid rgba(192,160,98,0.18);
          padding: 0 1.5rem;
          min-height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .live-header-left  { display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .live-header-right { display:flex; align-items:center; gap:12px; flex-shrink:0; }
        .live-title {
          font-family: Georgia, serif;
          font-size: clamp(0.9rem, 3vw, 1.3rem);
          font-weight: 300;
          letter-spacing: 0.05em;
          color: #e8dfc8;
          white-space: nowrap;
        }

        .live-body {
          display: grid;
          grid-template-columns: 1fr 280px;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        @media (max-width: 680px) {
          .live-body { grid-template-columns: 1fr; }
          .live-feed  { display: none; }
        }

        .live-leaderboard {
          overflow-y: auto;
          padding: 1.25rem 1.5rem;
          border-right: 0.5px solid rgba(192,160,98,0.1);
        }
        @media (max-width: 680px) {
          .live-leaderboard { border-right: none; padding: 1rem; }
        }

        .live-feed {
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          border-left: 0.5px solid rgba(192,160,98,0.1);
        }

        .live-spotlight {
          border-top: 0.5px solid rgba(192,160,98,0.15);
          padding: 0.75rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #08080f;
          flex-wrap: wrap;
        }
        .live-spot-name {
          font-family: Georgia, serif;
          font-size: clamp(1rem, 3.5vw, 1.2rem);
          font-weight: 300;
          letter-spacing: 0.03em;
        }

        .lb-row {
          display: grid;
          grid-template-columns: 28px 44px 1fr auto;
          align-items: center;
          gap: 24px;
          padding: 9px 0;
          border-bottom: 0.5px solid rgba(192,160,98,0.07);
          transition: background 0.4s;
        }
        @media (max-width: 360px) {
          .lb-row { grid-template-columns: 22px 36px 1fr auto; gap: 10px; }
        }
      `}</style>

      {/* Header */}
      <div className="live-header">
        <div className="live-header-left">
          <img src="/logo.png" alt="Logo" className="site-logo"
            onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
          <span className="live-title">Costume Gala — Live Results</span>
        </div>
        <div className="live-header-right">
          <span style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(192,160,98,0.5)' }}>
            Votes: <span style={{ color:'#c0a062', fontWeight:500 }}>{totalVotes}</span>
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(100,200,130,0.8)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'rgba(100,200,130,0.9)', animation:'pulse 1.5s infinite' }} />
            Live
          </div>
        </div>
      </div>

      {/* Body: leaderboard + feed */}
      <div className="live-body">

        {/* Leaderboard */}
        <div className="live-leaderboard">
          <div style={{ fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:'rgba(192,160,98,0.4)', marginBottom:'1rem' }}>Leaderboard</div>
          {sorted.map((f, i) => {
            const pct = Math.round((f.vote_count / maxVotes) * 100)
            const rankColor = i===0 ? '#c0a062' : i===1 ? 'rgba(192,160,98,0.65)' : i===2 ? 'rgba(192,160,98,0.5)' : 'rgba(192,160,98,0.3)'
            const rankSize  = i===0 ? '1.5rem' : i===1 ? '1.3rem' : i===2 ? '1.1rem' : '1rem'
            const barColor  = i===0 ? 'rgba(192,160,98,0.65)' : i===1 ? 'rgba(192,160,98,0.45)' : i===2 ? 'rgba(192,160,98,0.35)' : 'rgba(192,160,98,0.2)'
            return (
              <div key={f.id} className="lb-row"
                style={{ background: flashId===f.id ? 'rgba(192,160,98,0.12)' : 'transparent' }}>
                <div style={{ fontFamily:'Georgia,serif', fontSize:rankSize, fontWeight:300, color:rankColor, textAlign:'center' }}>{i+1}</div>
                <img src={f.photo_url} alt={f.name} style={{ width:44, height:58, objectFit:'cover', borderRadius:1, ...(i===0?{border:'0.5px solid rgba(192,160,98,0.4)'}:{}) }} />
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#e8dfc8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                  <div style={{ marginTop:5, height:2, background:'rgba(192,160,98,0.08)', borderRadius:1, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:pct+'%', background:barColor, transition:'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:15, fontWeight:500, color: i<3 ? '#c0a062' : 'rgba(192,160,98,0.4)' }}>{f.vote_count}</div>
                  <div style={{ fontSize:9, color:'rgba(232,223,200,0.25)', letterSpacing:'0.08em' }}>votes</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Feed (hidden on mobile via CSS) */}
        <div className="live-feed">
          <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(192,160,98,0.1)', fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:'rgba(192,160,98,0.4)' }}>Latest votes</div>
          {feed.map(item => (
            <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 1.25rem', animation:'slideIn 0.35s ease' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'rgba(192,160,98,0.3)', flexShrink:0 }} />
              <img src={item.photo_url} alt={item.name} style={{ width:32, height:42, objectFit:'cover', borderRadius:1, flexShrink:0 }} />
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#e8dfc8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                <div style={{ fontSize:10, color:'rgba(232,223,200,0.3)', marginTop:1 }}>{item.time}</div>
              </div>
            </div>
          ))}
          {feed.length === 0 && (
            <div style={{ padding:'2rem 1.25rem', fontSize:12, color:'rgba(232,223,200,0.2)', letterSpacing:'0.05em' }}>Waiting for votes…</div>
          )}
        </div>
      </div>

      {/* Currently leading footer */}
      {leader && (
        <div className="live-spotlight">
          <span style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(192,160,98,0.35)', whiteSpace:'nowrap' }}>Currently leading</span>
          <img src={leader.photo_url} alt={leader.name} style={{ width:38, height:50, objectFit:'cover', borderRadius:1, border:'0.5px solid rgba(192,160,98,0.3)', flexShrink:0 }} />
          <div>
            <div className="live-spot-name">{leader.name}</div>
            <div style={{ fontSize:10, color:'rgba(192,160,98,0.5)', letterSpacing:'0.1em', marginTop:2 }}>{leader.vote_count} vote{leader.vote_count!==1?'s':''}</div>
          </div>
        </div>
      )}
    </div>
  )
}
