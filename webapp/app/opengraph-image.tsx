import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'HavenAI — AI-Powered Personal Cybersecurity';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          position: 'relative',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Blue glow top-left */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: -200,
            width: 700,
            height: 700,
            background:
              'radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0) 70%)',
            display: 'flex',
          }}
        />
        {/* Purple glow bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            right: -200,
            width: 700,
            height: 700,
            background:
              'radial-gradient(circle, rgba(139,92,246,0.28) 0%, rgba(139,92,246,0) 70%)',
            display: 'flex',
          }}
        />

        {/* Subtle grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            display: 'flex',
          }}
        />

        {/* Logo — shield with lock (matches ShieldLock.tsx) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 140,
            height: 140,
            borderRadius: 32,
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.25)',
            marginBottom: 44,
          }}
        >
          <svg
            width="88"
            height="88"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#a78bfa"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <rect x="9.5" y="11" width="5" height="4" rx="0.5" />
            <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" />
          </svg>
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            marginBottom: 28,
            display: 'flex',
          }}
        >
          HavenAI
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 700,
            letterSpacing: '-0.035em',
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: 960,
            display: 'flex',
            background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          AI-Powered Personal Cybersecurity
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: 30,
            fontWeight: 400,
            color: '#94a3b8',
            marginTop: 32,
            letterSpacing: '-0.01em',
            display: 'flex',
          }}
        >
          Protect your device in real time
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background:
              'linear-gradient(90deg, transparent 0%, #3b82f6 30%, #8b5cf6 70%, transparent 100%)',
            display: 'flex',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
