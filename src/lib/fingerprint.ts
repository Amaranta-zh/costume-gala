// Browser fingerprint using FingerprintJS (free, open-source)
// Combines with IP hash server-side for double-vote prevention

let cachedFingerprint: string | null = null

export async function getFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint

  // Lazy-load FingerprintJS only when needed
  const FingerprintJS = await import('@fingerprintjs/fingerprintjs')
  const fp = await FingerprintJS.load()
  const result = await fp.get()
  cachedFingerprint = result.visitorId
  return cachedFingerprint
}

// Quick client-side check before hitting the server
export function getLocalVote(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('gala_voted_id')
}

export function setLocalVote(submissionId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('gala_voted_id', submissionId)
}
