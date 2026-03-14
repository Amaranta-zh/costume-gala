import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Costume Gala',
  description: 'Annual Costume Gala — Voting System',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0f' }}>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }

          .site-logo {
            height: 32px;
            width: auto;
            object-fit: contain;
            display: block;
          }
          @media (max-width: 600px) {
            .site-logo { height: 26px; }
          }

          .brand-text {
            font-family: Georgia, serif;
            font-size: 1.2rem;
            font-weight: 300;
            letter-spacing: 0.05em;
            color: #e8dfc8;
            white-space: nowrap;
          }

          .topbar-left {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
          }

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

          @media (max-width: 400px) {
            .hide-xs { display: none !important; }
          }
        `}</style>
        {children}
      </body>
    </html>
  )
}
