import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Costume Gala',
  description: 'Annual Costume Gala — Voting System',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0a0a0f' }}>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }

          /* ── Topbar responsive ── */
          .topbar {
            background: #0f0f18;
            border-bottom: 0.5px solid rgba(192,160,98,0.2);
            padding: 0 2rem;
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          }
          @media (max-width: 600px) {
            .topbar { padding: 0.75rem 1rem; gap: 0.5rem; }
          }

          /* ── Logo ── */
          .site-logo {
            height: 64px;
            width: auto;
            object-fit: contain;
            display: block;
          }
          @media (max-width: 600px) {
            .site-logo { height: 26px; }
          }

          /* ── Brand text (shown if no logo) ── */
          .brand-text {
            font-family: Georgia, serif;
            font-size: 1.2rem;
            font-weight: 300;
            letter-spacing: 0.05em;
            color: #e8dfc8;
            white-space: nowrap;
          }

          /* ── Topbar left cluster ── */
          .topbar-left {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
          }

          /* ── Stats row in judge panel ── */
          .stats-row {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
          }

          /* ── Action buttons row ── */
          .action-row {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          @media (max-width: 600px) {
            .action-row { width: 100%; justify-content: flex-end; }
          }

          /* ── Toolbar (search + filters) ── */
          .toolbar {
            padding: 0.75rem 2rem;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 0.5px solid rgba(192,160,98,0.08);
            flex-wrap: wrap;
          }
          @media (max-width: 600px) {
            .toolbar { padding: 0.75rem 1rem; }
          }

          /* ── Grids ── */
          .submission-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 1px;
            background: rgba(192,160,98,0.07);
          }
          @media (max-width: 480px) {
            .submission-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          /* ── Vote grid ── */
          .vote-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 1px;
            background: rgba(192,160,98,0.07);
            margin-bottom: 120px;
          }
          @media (max-width: 480px) {
            .vote-grid { grid-template-columns: repeat(2, 1fr); }
          }

          /* ── Live screen two-col layout ── */
          .live-main {
            display: grid;
            grid-template-columns: 1fr 300px;
            min-height: 0;
          }
          @media (max-width: 700px) {
            .live-main { grid-template-columns: 1fr; }
            .live-feed-panel { display: none; }
          }

          /* ── Card padding on mobile ── */
          .upload-card {
            width: 100%;
            max-width: 480px;
            background: #13131a;
            border: 0.5px solid rgba(192,160,98,0.25);
            border-radius: 2px;
            padding: 2.5rem 1.5rem;
            position: relative;
            z-index: 1;
          }
          @media (min-width: 480px) {
            .upload-card { padding: 3rem 2.5rem; }
          }

          /* ── Bottom confirm bar ── */
          .bottom-bar {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: #0f0f18;
            border-top: 0.5px solid rgba(192,160,98,0.2);
            padding: 12px 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            z-index: 50;
          }
          @media (max-width: 480px) {
            .bottom-bar { flex-direction: column; align-items: stretch; gap: 8px; }
            .bottom-bar button { width: 100%; }
          }

          /* ── Section labels ── */
          .section-label {
            padding: 10px 2rem 8px;
            font-size: 9px;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: rgba(192,160,98,0.4);
            border-bottom: 0.5px solid rgba(192,160,98,0.08);
          }
          @media (max-width: 600px) {
            .section-label { padding: 8px 1rem 6px; }
          }

          /* ── Timer / badge hide on very small screens ── */
          @media (max-width: 400px) {
            .hide-xs { display: none !important; }
          }
        `}</style>
        {children}
      </body>
    </html>
  )
}
