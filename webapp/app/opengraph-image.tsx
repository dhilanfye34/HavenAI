import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'HavenAI — AI-Powered Personal Cybersecurity';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

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
          background:
            'linear-gradient(135deg, #0a0a0f 0%, #0f0a1f 50%, #0a0a0f 100%)',
          position: 'relative',
        }}
      >
        {/* Blue glow top-left (linear gradient approximation) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 800,
            height: 500,
            background:
              'linear-gradient(135deg, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.05) 40%, transparent 70%)',
            display: 'flex',
          }}
        />
        {/* Purple glow bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 800,
            height: 500,
            background:
              'linear-gradient(315deg, rgba(139,92,246,0.28) 0%, rgba(139,92,246,0.06) 40%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Logo tile — shield with lock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 140,
            height: 140,
            borderRadius: 32,
            background: 'rgba(139,92,246,0.12)',
            border: '2px solid rgba(139,92,246,0.35)',
            marginBottom: 44,
          }}
        >
          <svg
            width="88"
            height="88"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c4b5fd"
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
            fontSize: 38,
            fontWeight: 600,
            color: '#c4b5fd',
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
            color: '#ffffff',
            letterSpacing: '-0.035em',
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: 980,
            display: 'flex',
            padding: '0 40px',
          }}
        >
          AI-Powered Personal Cybersecurity
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: 28,
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
            height: 5,
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
