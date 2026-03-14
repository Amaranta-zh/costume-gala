'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Submission } from '@/lib/supabase'

type Filter = 'all' | 'finalist' | 'pending'
type Sort   = 'newest' | 'oldest' | 'name'

export default function JudgePage() {
  const params    = useSearchParams()
  const judgeKey  = params.get('key') ?? ''

  const [submissions, setSubmissions]     = useState<Submission[]>([])
  const [loading, setLoading]             = useState(true)
  const [unauthorized, setUnauthorized]   = useState(false)
  const [filter, setFilter]               = useState<Filter>('all')
  const [sort, setSort]                   = useState<Sort>('newest')
  const [search, setSearch]               = useState('')
  const [saving, setSaving]               = useState(false)
  const [publishing, setPublishing]       = useState(false)
  const [published, setPublished]         = useState(false)
  const [votingOpen, setVotingOpen]       = useState(false)
  const [modal, setModal]                 = useState<Submission | null>(null)
  const [toast, setToast]                 = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const loadSubmissions = useCallback(async () => {
    const res = await fetch(`/api/finalists?key=${judgeKey}`)
    if (res.status === 401) { setUnauthorized(true); setLoading(false); return }
    const data = await res.json()
    setSubmissions(data.submissions ?? [])
    setLoading(false)
  }, [judgeKey])

  useEffect(() => { loadSubmissions() }, [loadSubmissions])

  async function toggleFinalist(id: string) {
    const updated = submissions.map(s => s.id === id ? { ...s, is_finalist: !s.is_finalist } : s)
    setSubmissions(updated)
    if (modal?.id === id) setModal(prev => prev ? { ...prev, is_finalist: !prev.is_finalist } : null)
    setSaving(true)
    const ids = updated.filter(s => s.is_finalist).map(s => s.id)
    await fetch(`/api/finalists?key=${judgeKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalist_ids: ids }),
    })
    setSaving(false)
    const sub = submissions.find(s => s.id === id)
    showToast(!sub?.is_finalist ? `${sub?.name} added` : `${sub?.name} removed`)
  }

  async function handlePublish() {
    const finalists = submissions.filter(s => s.is_finalist)
    if (finalists.length === 0) { showToast('Select at least one finalist first'); return }
    setPublishing(true)
    await fetch(`/api/finalists?key=${judgeKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalist_ids: finalists.map(s => s.id) }),
    })
    setPublished(true); setPublishing(false)
    showToast(`${finalists.length} finalists published`)
  }

  async function toggleVoting() {
    const next = !votingOpen
    await fetch(`/api/finalists?key=${judgeKey}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_open: next }),
    })
    setVotingOpen(next)
    showToast(next ? 'Voting is now open' : 'Voting closed')
  }

  function timeAgo(dateStr: string) {
    const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (mins < 2) return 'just now'
    if (mins < 60) return `${mins}m ago`
    return `${Math.round(mins / 60)}h ago`
  }

  const finalistsList  = submissions.filter(s => s.is_finalist)
  const finalistCount  = finalistsList.length

  const filtered = submissions
    .filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      if (filter === 'finalist') return s.is_finalist
      if (filter === 'pending')  return !s.is_finalist
      return true
    })
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return a.name.localeCompare(b.name)
    })

  const nonFinalists = filtered.filter(s => !s.is_finalist)

  if (loading)      return <div style={{ ...s.page, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(232,223,200,0.3)' }}>Loading...</div>
  if (unauthorized) return <div style={{ ...s.page, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(200,100,100,0.7)' }}>Unauthorized. Check your judge key.</div>

  return (
    <div style={s.page}>
      <style>{`
        .judge-topbar {
          background: #0f0f18;
          border-bottom: 0.5px solid rgba(192,160,98,0.2);
          padding: 0.75rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .judge-topbar-row1 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .judge-topbar-row2 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .judge-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .judge-toolbar {
          padding: 0.6rem 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 0.5px solid rgba(192,160,98,0.08);
          flex-wrap: wrap;
        }
        .judge-search { flex: 1; min-width: 140px; }
        .judge-filters {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .judge-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1px;
          background: rgba(192,160,98,0.08);
        }
        @media (max-width: 480px) {
          .judge-grid { grid-template-columns: repeat(2, 1fr); }
          .judge-topbar { padding: 0.6rem 1rem; }
        }
      `}</style>

      {/* Topbar — split into two rows on mobile */}
      <div className="judge-topbar">
        <div className="judge-topbar-row1">
          {/* Left: logo + title */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/logo.png" alt="Logo" className="site-logo"
              onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
            <span style={s.brand}>Costume Gala</span>
            <span style={s.badgePanel}>Judge</span>
            {saving && <span style={{ fontSize:9, color:'rgba(232,223,200,0.3)' }}>Saving…</span>}
          </div>
          {/* Right: stats */}
          <div style={{ display:'flex', gap:6 }}>
            <div style={s.stat}><div style={s.statN}>{submissions.length}</div><div style={s.statL}>Total</div></div>
            <div style={s.stat}><div style={{ ...s.statN, color:'rgba(100,200,130,0.9)' }}>{finalistCount}</div><div style={s.statL}>Finalists</div></div>
          </div>
        </div>
        <div className="judge-topbar-row2">
          <div className="judge-actions">
            <button style={{ ...s.actionBtn, ...(published ? s.actionBtnGreen : {}) }} onClick={handlePublish} disabled={publishing}>
              {published ? `${finalistCount} published` : 'Publish finalists'}
            </button>
            <button style={{ ...s.actionBtn, ...(votingOpen ? s.actionBtnGreen : {}) }} onClick={toggleVoting}>
              {votingOpen ? 'Close voting' : 'Open voting'}
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="judge-toolbar">
        <div className="judge-search">
          <input style={s.searchInp} placeholder="Search by name…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="judge-filters">
          {(['all','finalist','pending'] as Filter[]).map(f => (
            <button key={f} style={{ ...s.filterBtn, ...(filter===f ? s.filterBtnActive : {}) }} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'finalist' ? 'Finalists' : 'Pending'}
            </button>
          ))}
        </div>
        <select style={s.sortSel} value={sort} onChange={e => setSort(e.target.value as Sort)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">A–Z</option>
        </select>
      </div>

      {/* Finalists pinned section */}
      {filter === 'all' && finalistCount > 0 && (
        <>
          <div style={s.sectionLabel}>Finalists — {finalistCount} selected</div>
          <div className="judge-grid">
            {finalistsList.map(sub => <SubmissionCard key={sub.id} sub={sub} onToggle={toggleFinalist} onOpen={setModal} timeAgo={timeAgo} />)}
          </div>
          <div style={s.sectionLabel}>All submissions</div>
        </>
      )}

      {/* Main grid */}
      <div className="judge-grid">
        {(filter === 'all' ? nonFinalists : filtered).map(sub =>
          <SubmissionCard key={sub.id} sub={sub} onToggle={toggleFinalist} onOpen={setModal} timeAgo={timeAgo} />
        )}
        {filtered.length === 0 && <div style={s.empty}>No submissions match this filter.</div>}
      </div>

      {/* Detail modal */}
      {modal && (
        <div style={s.modalWrap} onClick={() => setModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <button style={s.modalClose} onClick={() => setModal(null)}>✕</button>
            <img src={modal.photo_url} alt={modal.name} style={{ width:'100%', aspectRatio:'3/4', objectFit:'cover' }} />
            <div style={{ padding:'1.25rem 1.5rem 1.5rem' }}>
              <div style={{ fontFamily:'Georgia,serif', fontSize:'1.5rem', fontWeight:300, color:'#e8dfc8', marginBottom:4 }}>{modal.name}</div>
              <div style={{ fontSize:11, color:'rgba(232,223,200,0.35)', marginBottom:'1rem' }}>
                Submitted {timeAgo(modal.created_at)}{modal.is_finalist ? ' · Finalist' : ''}
              </div>
              <button style={{ ...s.toggleBtn, ...(modal.is_finalist ? s.toggleRemove : s.toggleAdd), width:'100%', padding:9 }}
                onClick={() => toggleFinalist(modal.id)}>
                {modal.is_finalist ? 'Remove from finalists' : '+ Add to finalists'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  )
}

function SubmissionCard({ sub, onToggle, onOpen, timeAgo }: {
  sub: Submission; onToggle: (id:string)=>void; onOpen: (s:Submission)=>void; timeAgo:(d:string)=>string
}) {
  return (
    <div style={{ ...cs.card, ...(sub.is_finalist ? cs.cardFinalist : {}) }} onClick={() => onOpen(sub)}>
      {sub.is_finalist && <div style={cs.ribbon}>Finalist</div>}
      <img src={sub.photo_url} alt={sub.name} style={{ ...cs.img, filter: sub.is_finalist ? 'none' : 'grayscale(20%)' }} />
      <div style={{ padding:'8px 10px 10px' }}>
        <div style={cs.name}>{sub.name}</div>
        <div style={cs.time}>{timeAgo(sub.created_at)}</div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:6 }}>
          <button style={{ ...cs.btn, ...(sub.is_finalist ? cs.btnRemove : cs.btnAdd) }}
            onClick={e => { e.stopPropagation(); onToggle(sub.id) }}>
            {sub.is_finalist ? 'Remove' : '+ Select'}
          </button>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:           { background:'#0a0a0f', minHeight:'100vh', fontFamily:'sans-serif', color:'#e8dfc8' },
  brand:          { fontFamily:'Georgia,serif', fontSize:'1.1rem', fontWeight:300, letterSpacing:'0.05em', whiteSpace:'nowrap' },
  badgePanel:     { fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(192,160,98,0.6)', border:'0.5px solid rgba(192,160,98,0.3)', padding:'3px 6px', borderRadius:1, whiteSpace:'nowrap' },
  stat:           { background:'#13131a', border:'0.5px solid rgba(192,160,98,0.15)', borderRadius:1, padding:'4px 12px', textAlign:'center' },
  statN:          { fontSize:15, fontWeight:500, color:'#c0a062' },
  statL:          { fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(232,223,200,0.35)' },
  actionBtn:      { background:'transparent', border:'0.5px solid rgba(192,160,98,0.45)', color:'#e8dfc8', fontFamily:'sans-serif', fontSize:10, fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase', padding:'7px 12px', cursor:'pointer', borderRadius:1, whiteSpace:'nowrap' },
  actionBtnGreen: { borderColor:'rgba(100,200,130,0.5)', color:'rgba(100,200,130,0.8)' },
  searchInp:      { width:'100%', background:'#13131a', border:'0.5px solid rgba(192,160,98,0.18)', borderRadius:1, padding:'7px 10px', color:'#e8dfc8', fontFamily:'sans-serif', fontSize:14, outline:'none', boxSizing:'border-box' },
  filterBtn:      { background:'#13131a', border:'0.5px solid rgba(192,160,98,0.18)', color:'rgba(232,223,200,0.5)', fontFamily:'sans-serif', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', padding:'6px 10px', cursor:'pointer', borderRadius:1, whiteSpace:'nowrap' },
  filterBtnActive:{ borderColor:'rgba(192,160,98,0.55)', color:'#c0a062', background:'rgba(192,160,98,0.06)' },
  sortSel:        { background:'#13131a', border:'0.5px solid rgba(192,160,98,0.18)', color:'rgba(232,223,200,0.6)', fontFamily:'sans-serif', fontSize:10, padding:'6px 8px', borderRadius:1, outline:'none', cursor:'pointer' },
  sectionLabel:   { padding:'8px 1rem 6px', fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(192,160,98,0.4)', borderBottom:'0.5px solid rgba(192,160,98,0.08)' },
  empty:          { gridColumn:'1/-1', padding:'3rem', textAlign:'center', color:'rgba(232,223,200,0.2)', fontSize:13 },
  modalWrap:      { position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' },
  modal:          { background:'#13131a', border:'0.5px solid rgba(192,160,98,0.25)', borderRadius:2, width:360, maxWidth:'92vw', overflow:'hidden', position:'relative' },
  modalClose:     { position:'absolute', top:10, right:10, background:'#13131a', border:'0.5px solid rgba(192,160,98,0.25)', color:'rgba(232,223,200,0.5)', fontSize:13, width:28, height:28, cursor:'pointer', borderRadius:1, display:'flex', alignItems:'center', justifyContent:'center' },
  toggleBtn:      { fontFamily:'sans-serif', fontSize:9, fontWeight:500, letterSpacing:'0.15em', textTransform:'uppercase', padding:'6px 12px', cursor:'pointer', borderRadius:1, border:'0.5px solid' },
  toggleAdd:      { borderColor:'rgba(192,160,98,0.35)', color:'rgba(192,160,98,0.6)', background:'transparent' },
  toggleRemove:   { borderColor:'rgba(100,200,130,0.35)', color:'rgba(100,200,130,0.7)', background:'rgba(100,200,130,0.05)' },
  toast:          { position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#1a2a1a', border:'0.5px solid rgba(100,200,130,0.4)', color:'rgba(100,200,130,0.9)', fontSize:11, letterSpacing:'0.1em', padding:'8px 16px', borderRadius:1, zIndex:200, whiteSpace:'nowrap' },
}

const cs: Record<string, React.CSSProperties> = {
  card:         { background:'#0a0a0f', position:'relative', cursor:'pointer' },
  cardFinalist: { background:'#0d0f0c' },
  img:          { width:'100%', aspectRatio:'3/4', objectFit:'cover', display:'block' },
  ribbon:       { position:'absolute', top:0, right:0, background:'#1a2a1a', borderBottom:'0.5px solid rgba(100,200,130,0.3)', borderLeft:'0.5px solid rgba(100,200,130,0.3)', padding:'3px 6px', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(100,200,130,0.8)' },
  name:         { fontSize:12, fontWeight:500, color:'#e8dfc8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  time:         { fontSize:10, color:'rgba(232,223,200,0.3)', marginTop:2 },
  btn:          { fontFamily:'sans-serif', fontSize:9, fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase', padding:'5px 8px', cursor:'pointer', borderRadius:1, border:'0.5px solid' },
  btnAdd:       { borderColor:'rgba(192,160,98,0.35)', color:'rgba(192,160,98,0.6)', background:'transparent' },
  btnRemove:    { borderColor:'rgba(100,200,130,0.35)', color:'rgba(100,200,130,0.7)', background:'rgba(100,200,130,0.05)' },
}
