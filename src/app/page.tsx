'use client'

import { useState, useRef } from 'react'

export default function GuestUploadPage() {
  const [name, setName]             = useState('')
  const [photo, setPhoto]           = useState<File | null>(null)
  const [preview, setPreview]       = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [refCode, setRefCode]       = useState('')
  const [errors, setErrors]         = useState<{ name?: string; photo?: string }>({})
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('File exceeds 5 MB. Please choose a smaller photo.'); return }
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
    setErrors(prev => ({ ...prev, photo: undefined }))
  }

  async function handleSubmit() {
    const errs: { name?: string; photo?: string } = {}
    if (!name.trim()) errs.name = 'Please enter your full name.'
    if (!photo)       errs.photo = 'Please upload a photo.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('photo', photo!)
      const res = await fetch('/api/submissions', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? 'Something went wrong.'); return }
      setRefCode('#' + data.submission.id.slice(0, 6).toUpperCase())
      setSubmitted(true)
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={s.stage}>
      <div style={s.bgLines} />
      <div style={{ ...s.corner, top: 24, left: 24, borderTop: '1px solid rgba(192,160,98,0.5)', borderLeft: '1px solid rgba(192,160,98,0.5)' }} />
      <div style={{ ...s.corner, top: 24, right: 24, borderTop: '1px solid rgba(192,160,98,0.5)', borderRight: '1px solid rgba(192,160,98,0.5)' }} />
      <div style={{ ...s.corner, bottom: 24, left: 24, borderBottom: '1px solid rgba(192,160,98,0.5)', borderLeft: '1px solid rgba(192,160,98,0.5)' }} />
      <div style={{ ...s.corner, bottom: 24, right: 24, borderBottom: '1px solid rgba(192,160,98,0.5)', borderRight: '1px solid rgba(192,160,98,0.5)' }} />

      <div className="upload-card">
        <div style={s.cardTop} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.png" alt="Logo" style={{ height: 128, width: 'auto', objectFit: 'contain' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>

        {!submitted ? (
          <>
            <p style={s.eventLabel}>Annual Costume Gala — April 2026</p>
            <h1 style={s.eventTitle}>Register Your<br />Costume</h1>
            <p style={s.eventSub}>Guest Submission Portal</p>

            <div style={s.divider}>
              <div style={s.divLine} /><div style={s.divDiamond} /><div style={s.divLine} />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Full Name</label>
              <input style={s.input} type="text" placeholder="Your name"
                maxLength={60} value={name}
                onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })) }} />
              <div style={s.charCount}>{name.length}/60</div>
              {errors.name && <div style={s.errorMsg}>{errors.name}</div>}
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Costume Photo</label>
              {!preview ? (
                <div style={s.uploadZone} onClick={() => fileRef.current?.click()}>
                  <div style={s.uploadIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(192,160,98,0.7)" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p style={s.uploadText}>Tap to upload your photo</p>
                  <p style={s.uploadSub}>JPG or PNG — max 5 MB</p>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <img src={preview} alt="preview" style={s.previewImg} />
                  <button style={s.changeBtn} onClick={() => fileRef.current?.click()}>Change</button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFile} />
              {errors.photo && <div style={s.errorMsg}>{errors.photo}</div>}
            </div>

            <button style={{ ...s.submitBtn, opacity: submitting ? 0.5 : 1 }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Registration'}
            </button>

            <p style={s.footerNote}>
              Your photo and name will be visible to judges<br />
              and — if selected — to all guests during voting.
            </p>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={s.checkRing}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(100,200,130,0.9)" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 style={s.successTitle}>You&apos;re Registered</h2>
            <p style={s.successMsg}>Your submission has been received.<br />The judges will announce finalists shortly.</p>
            <div style={s.ticketWrap}>
              <div style={s.ticketLabel}>Submission Reference</div>
              <div style={s.ticketVal}>{refCode}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  stage:        { background: '#0a0a0f', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' },
  bgLines:      { position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(192,160,98,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(192,160,98,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px' },
  corner:       { position: 'absolute', width: 80, height: 80 },
  cardTop:      { position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(192,160,98,0.6), transparent)' },
  eventLabel:   { fontSize: 10, letterSpacing: '0.25em', color: 'rgba(192,160,98,0.6)', textTransform: 'uppercase' as const, textAlign: 'center' as const, marginBottom: '0.75rem' },
  eventTitle:   { fontFamily: 'Georgia, serif', fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', fontWeight: 300, color: '#e8dfc8', textAlign: 'center' as const, letterSpacing: '0.04em', lineHeight: 1.2, marginBottom: '0.4rem' },
  eventSub:     { fontSize: 10, letterSpacing: '0.2em', color: 'rgba(232,223,200,0.3)', textAlign: 'center' as const, textTransform: 'uppercase' as const, marginBottom: '2rem' },
  divider:      { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' },
  divLine:      { flex: 1, height: '0.5px', background: 'rgba(192,160,98,0.2)' },
  divDiamond:   { width: 6, height: 6, background: 'rgba(192,160,98,0.5)', transform: 'rotate(45deg)' },
  fieldGroup:   { marginBottom: '1.25rem' },
  label:        { display: 'block', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'rgba(192,160,98,0.7)', marginBottom: '0.5rem' },
  input:        { width: '100%', background: '#0d0d14', border: '0.5px solid rgba(192,160,98,0.2)', borderRadius: 1, padding: '0.75rem 1rem', color: '#e8dfc8', fontFamily: 'sans-serif', fontSize: 16, fontWeight: 300, outline: 'none', boxSizing: 'border-box' as const },
  charCount:    { fontSize: 10, color: 'rgba(232,223,200,0.2)', textAlign: 'right' as const, marginTop: 4 },
  errorMsg:     { fontSize: 11, color: '#c0524a', marginTop: 4 },
  uploadZone:   { border: '0.5px dashed rgba(192,160,98,0.3)', borderRadius: 1, padding: '1.75rem 1rem', textAlign: 'center' as const, cursor: 'pointer' },
  uploadIcon:   { width: 36, height: 36, margin: '0 auto 0.75rem', border: '0.5px solid rgba(192,160,98,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  uploadText:   { fontSize: 12, color: 'rgba(232,223,200,0.5)', letterSpacing: '0.05em' },
  uploadSub:    { fontSize: 10, color: 'rgba(232,223,200,0.25)', marginTop: '0.3rem' },
  previewImg:   { width: '100%', maxHeight: 220, objectFit: 'cover' as const, borderRadius: 1, border: '0.5px solid rgba(192,160,98,0.25)', display: 'block' },
  changeBtn:    { position: 'absolute' as const, bottom: 8, right: 8, background: 'rgba(10,10,15,0.85)', border: '0.5px solid rgba(192,160,98,0.3)', color: 'rgba(192,160,98,0.8)', fontSize: 10, letterSpacing: '0.1em', padding: '5px 10px', cursor: 'pointer', textTransform: 'uppercase' as const, borderRadius: 1 },
  submitBtn:    { width: '100%', background: 'transparent', border: '0.5px solid rgba(192,160,98,0.45)', color: '#e8dfc8', fontFamily: 'sans-serif', fontSize: 11, fontWeight: 500, letterSpacing: '0.25em', textTransform: 'uppercase' as const, padding: '1rem', cursor: 'pointer', marginTop: '0.5rem', borderRadius: 1 },
  footerNote:   { marginTop: '1.5rem', fontSize: 10, color: 'rgba(232,223,200,0.2)', textAlign: 'center' as const, letterSpacing: '0.08em', lineHeight: 1.6 },
  checkRing:    { width: 56, height: 56, border: '1px solid rgba(100,200,130,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' },
  successTitle: { fontFamily: 'Georgia, serif', fontSize: '1.75rem', fontWeight: 300, color: '#e8dfc8', marginBottom: '0.5rem' },
  successMsg:   { fontSize: 12, color: 'rgba(232,223,200,0.4)', letterSpacing: '0.05em', lineHeight: 1.7 },
  ticketWrap:   { marginTop: '1.5rem', border: '0.5px solid rgba(192,160,98,0.2)', padding: '0.75rem 1.5rem', display: 'inline-block', borderRadius: 1 },
  ticketLabel:  { fontSize: 9, letterSpacing: '0.2em', color: 'rgba(192,160,98,0.5)', textTransform: 'uppercase' as const },
  ticketVal:    { fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#c0a062', letterSpacing: '0.1em' },
}
