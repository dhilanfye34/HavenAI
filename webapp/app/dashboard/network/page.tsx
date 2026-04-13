'use client';

import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Globe, Lock, MessageCircle, Server, ShieldCheck, Wifi } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { useNavigate } from '../context/NavigationContext';

interface ConnectionInfo {
  id: string;
  app: string;
  destination: string;
  service: string;       // Human-readable service name (e.g. "Google", "stripe.com")
  protocol: string;      // e.g. "HTTPS", "DNS", "SSH"
  port?: number;
  count: number;
  status: 'safe' | 'unknown';
}

// ── Port → protocol / description ──
const PORT_INFO: Record<number, { protocol: string; desc: string }> = {
  22:   { protocol: 'SSH',        desc: 'Secure shell' },
  53:   { protocol: 'DNS',        desc: 'Domain name lookup' },
  80:   { protocol: 'HTTP',       desc: 'Web traffic (unencrypted)' },
  443:  { protocol: 'HTTPS',      desc: 'Encrypted web traffic' },
  993:  { protocol: 'IMAPS',      desc: 'Email (IMAP)' },
  995:  { protocol: 'POP3S',      desc: 'Email (POP3)' },
  587:  { protocol: 'SMTP',       desc: 'Outgoing email' },
  465:  { protocol: 'SMTPS',      desc: 'Outgoing email (encrypted)' },
  853:  { protocol: 'DNS-TLS',    desc: 'Encrypted DNS' },
  3478: { protocol: 'STUN/TURN',  desc: 'Video/voice call relay' },
  5228: { protocol: 'GCM',        desc: 'Google push notifications' },
  5222: { protocol: 'XMPP',       desc: 'Messaging' },
  5223: { protocol: 'XMPP-TLS',   desc: 'Messaging (encrypted)' },
  8443: { protocol: 'HTTPS-ALT',  desc: 'Encrypted web (alt port)' },
};

function getProtocolInfo(port?: number): { protocol: string; desc: string } {
  if (!port) return { protocol: '', desc: '' };
  return PORT_INFO[port] || { protocol: `Port ${port}`, desc: '' };
}

// ── Extract root domain from hostname ──
// "api.v2.stripe.com" → "stripe.com"
// "ec2-52-1-2-3.compute-1.amazonaws.com" → "amazonaws.com"
function extractRootDomain(hostname: string): string {
  const parts = hostname.toLowerCase().replace(/\.$/, '').split('.');
  if (parts.length <= 2) return hostname.toLowerCase();
  // Handle known two-part TLDs (co.uk, com.au, etc.)
  const twoPartTLDs = ['co.uk', 'co.jp', 'com.au', 'co.in', 'com.br', 'co.za'];
  const lastTwo = parts.slice(-2).join('.');
  if (twoPartTLDs.includes(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

// Capitalize a domain for display: "stripe.com" → "Stripe"
function domainToLabel(domain: string): string {
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ── Hostname-based identification ──
const SAFE_HOST_FRAGMENTS = [
  'apple.com', 'icloud.com', 'googleapis.com', 'google.com', 'gstatic.com',
  'googleusercontent.com', 'googlevideo.com', 'google-analytics.com',
  'microsoft.com', 'office.com', 'office365.com', 'live.com', 'msn.com',
  'github.com', 'githubusercontent.com', 'github.io',
  'cloudflare.com', 'cloudflare-dns.com', 'cloudflare.net',
  'amazonaws.com', 'aws.amazon.com', 'amazon.com',
  'slack.com', 'discord.com', 'discord.gg',
  'spotify.com', 'scdn.co',
  'akamai.net', 'akamaized.net', 'akamaitechnologies.com',
  'fastly.net', 'fastlylb.net',
  'cloudfront.net',
  'facebook.com', 'meta.com', 'whatsapp.com', 'fbcdn.net', 'instagram.com',
  'notion.so', 'figma.com', 'linear.app', 'vercel.app', 'vercel-dns.com',
  'anthropic.com', 'claude.ai', 'openai.com', 'newrelic.com',
  'docker.com', 'docker.io',
  'npmjs.org', 'npmjs.com', 'yarnpkg.com',
  'sentry.io', 'segment.io', 'segment.com',
  'stripe.com', 'twilio.com',
  'zoom.us', 'zoomgov.com',
  'dropbox.com', 'dropboxapi.com',
  'adobe.com', 'typekit.net',
  'stackoverflow.com', 'stackexchange.com',
  'wikipedia.org', 'wikimedia.org',
  'reddit.com', 'redd.it',
  'twitter.com', 'x.com', 'twimg.com',
  'linkedin.com',
  'youtube.com', 'ytimg.com', 'yt3.ggpht.com',
];

// ── IP prefix → service name mapping ──
// Identifies known cloud/CDN services by their IP ranges
const IP_SERVICE_MAP: { prefix: string; service: string }[] = [
  // Google IPv6
  { prefix: '2607:f8b0:', service: 'Google' },
  { prefix: '2a00:1450:', service: 'Google' },
  { prefix: '64:ff9b::', service: 'Google (NAT64)' },
  // Google IPv4
  { prefix: '142.250.', service: 'Google' },
  { prefix: '142.251.', service: 'Google' },
  { prefix: '172.217.', service: 'Google' },
  { prefix: '216.58.', service: 'Google' },
  { prefix: '216.239.', service: 'Google' },
  { prefix: '74.125.', service: 'Google' },
  { prefix: '173.194.', service: 'Google' },
  { prefix: '209.85.', service: 'Google' },
  { prefix: '108.177.', service: 'Google' },
  { prefix: '35.', service: 'Google Cloud' },
  // Cloudflare IPv6
  { prefix: '2606:4700:', service: 'Cloudflare' },
  { prefix: '2a06:98c0:', service: 'Cloudflare' },
  { prefix: '2a06:98c1:', service: 'Cloudflare' },
  // Cloudflare IPv4
  { prefix: '104.16.', service: 'Cloudflare' },
  { prefix: '104.17.', service: 'Cloudflare' },
  { prefix: '104.18.', service: 'Cloudflare' },
  { prefix: '104.19.', service: 'Cloudflare' },
  { prefix: '104.20.', service: 'Cloudflare' },
  { prefix: '104.21.', service: 'Cloudflare' },
  { prefix: '104.22.', service: 'Cloudflare' },
  { prefix: '104.24.', service: 'Cloudflare' },
  { prefix: '104.25.', service: 'Cloudflare' },
  { prefix: '104.26.', service: 'Cloudflare' },
  { prefix: '104.27.', service: 'Cloudflare' },
  { prefix: '162.159.', service: 'Cloudflare' },
  { prefix: '172.64.', service: 'Cloudflare' },
  { prefix: '172.66.', service: 'Cloudflare' },
  { prefix: '172.67.', service: 'Cloudflare' },
  { prefix: '173.245.', service: 'Cloudflare' },
  { prefix: '198.41.', service: 'Cloudflare' },
  { prefix: '1.1.1.', service: 'Cloudflare DNS' },
  { prefix: '1.0.0.', service: 'Cloudflare DNS' },
  // AWS IPv6
  { prefix: '2600:1901:', service: 'Google Cloud' },
  { prefix: '2600:9000:', service: 'AWS CloudFront' },
  // AWS IPv4
  { prefix: '54.', service: 'AWS' },
  { prefix: '52.', service: 'AWS' },
  { prefix: '3.', service: 'AWS' },
  { prefix: '18.', service: 'AWS' },
  { prefix: '13.', service: 'AWS' },
  // Microsoft / Azure IPv6
  { prefix: '2603:', service: 'Microsoft Azure' },
  { prefix: '2620:1ec:', service: 'Microsoft' },
  // Microsoft IPv4
  { prefix: '20.', service: 'Microsoft Azure' },
  { prefix: '40.', service: 'Microsoft Azure' },
  { prefix: '13.', service: 'Microsoft Azure' },
  // Fastly
  { prefix: '151.101.', service: 'Fastly CDN' },
  // Akamai
  { prefix: '23.', service: 'Akamai CDN' },
  { prefix: '184.', service: 'Akamai CDN' },
  // Apple
  { prefix: '17.', service: 'Apple' },
  { prefix: '2620:149:', service: 'Apple' },
  // Fly.io
  { prefix: '2607:6bc0:', service: 'Fly.io' },
  // Anthropic
  { prefix: '160.79.', service: 'Anthropic (Claude)' },
  // New Relic
  { prefix: '162.247.', service: 'New Relic' },
  // Private/local
  { prefix: '192.168.', service: 'Local network' },
  { prefix: '10.', service: 'Local network' },
  { prefix: '127.', service: 'Localhost' },
  { prefix: '::1', service: 'Localhost' },
  { prefix: 'fe80:', service: 'Local network' },
  { prefix: 'fd', service: 'Local network' },
];

// Hostname → friendly service name
const HOSTNAME_SERVICE_MAP: { fragment: string; service: string }[] = [
  { fragment: '1e100.net', service: 'Google' },
  { fragment: 'google', service: 'Google' },
  { fragment: 'googleapis', service: 'Google APIs' },
  { fragment: 'googleusercontent', service: 'Google' },
  { fragment: 'googlevideo', service: 'Google Video' },
  { fragment: 'gstatic', service: 'Google' },
  { fragment: 'youtube', service: 'YouTube' },
  { fragment: 'ytimg', service: 'YouTube' },
  { fragment: 'ggpht', service: 'Google' },
  { fragment: 'apple.com', service: 'Apple' },
  { fragment: 'icloud', service: 'Apple iCloud' },
  { fragment: 'microsoft', service: 'Microsoft' },
  { fragment: 'office', service: 'Microsoft Office' },
  { fragment: 'github', service: 'GitHub' },
  { fragment: 'cloudflare', service: 'Cloudflare' },
  { fragment: 'amazonaws', service: 'AWS' },
  { fragment: 'cloudfront', service: 'AWS CloudFront' },
  { fragment: 'slack.com', service: 'Slack' },
  { fragment: 'discord', service: 'Discord' },
  { fragment: 'spotify', service: 'Spotify' },
  { fragment: 'facebook', service: 'Facebook' },
  { fragment: 'fbcdn', service: 'Facebook CDN' },
  { fragment: 'instagram', service: 'Instagram' },
  { fragment: 'whatsapp', service: 'WhatsApp' },
  { fragment: 'twitter', service: 'X (Twitter)' },
  { fragment: 'linkedin', service: 'LinkedIn' },
  { fragment: 'reddit', service: 'Reddit' },
  { fragment: 'notion', service: 'Notion' },
  { fragment: 'figma', service: 'Figma' },
  { fragment: 'vercel', service: 'Vercel' },
  { fragment: 'anthropic', service: 'Anthropic' },
  { fragment: 'openai', service: 'OpenAI' },
  { fragment: 'zoom.us', service: 'Zoom' },
  { fragment: 'dropbox', service: 'Dropbox' },
  { fragment: 'akamai', service: 'Akamai CDN' },
  { fragment: 'fastly', service: 'Fastly CDN' },
  { fragment: 'docker', service: 'Docker' },
  { fragment: 'sentry', service: 'Sentry' },
  { fragment: 'stripe', service: 'Stripe' },
  { fragment: 'twilio', service: 'Twilio' },
  { fragment: 'adobe', service: 'Adobe' },
  { fragment: 'fly.io', service: 'Fly.io' },
  // Update / package managers
  { fragment: 'brew.sh', service: 'Homebrew' },
  { fragment: 'pypi.org', service: 'PyPI (Python packages)' },
  { fragment: 'rubygems.org', service: 'RubyGems' },
  { fragment: 'crates.io', service: 'Rust Crates' },
  // Analytics / tracking (common but safe)
  { fragment: 'googletagmanager', service: 'Google Tag Manager' },
  { fragment: 'doubleclick', service: 'Google Ads' },
  { fragment: 'hotjar', service: 'Hotjar Analytics' },
  { fragment: 'mixpanel', service: 'Mixpanel Analytics' },
  { fragment: 'amplitude', service: 'Amplitude Analytics' },
  { fragment: 'intercom', service: 'Intercom' },
  // Communication
  { fragment: 'slack-edge', service: 'Slack' },
  { fragment: 'teams.microsoft', service: 'Microsoft Teams' },
  { fragment: 'signal.org', service: 'Signal' },
  { fragment: 'telegram.org', service: 'Telegram' },
  // Streaming
  { fragment: 'netflix', service: 'Netflix' },
  { fragment: 'nflxvideo', service: 'Netflix Video' },
  { fragment: 'hulu', service: 'Hulu' },
  { fragment: 'disneyplus', service: 'Disney+' },
  { fragment: 'twitch', service: 'Twitch' },
  // Gaming
  { fragment: 'steampowered', service: 'Steam' },
  { fragment: 'steamcommunity', service: 'Steam' },
  { fragment: 'epicgames', service: 'Epic Games' },
  // OS updates
  { fragment: 'swscan.apple', service: 'Apple Software Update' },
  { fragment: 'mesu.apple', service: 'Apple Software Update' },
  { fragment: 'updates.cdn-apple', service: 'Apple Updates CDN' },
  { fragment: 'windowsupdate', service: 'Windows Update' },
  // Security
  { fragment: 'letsencrypt', service: 'Let\'s Encrypt' },
  { fragment: 'ocsp', service: 'Certificate check (OCSP)' },
  { fragment: 'crl.', service: 'Certificate check (CRL)' },
  // Render (your backend)
  { fragment: 'onrender.com', service: 'HavenAI Backend' },
  { fragment: 'render.com', service: 'Render' },
];

function identifyService(hostname?: string, ip?: string): string {
  // Try hostname first
  if (hostname) {
    const h = hostname.toLowerCase();
    for (const { fragment, service } of HOSTNAME_SERVICE_MAP) {
      if (h.includes(fragment)) return service;
    }
    // Fallback: use the root domain as a label
    // "api.someapp.com" → "Someapp" instead of ""
    const root = extractRootDomain(h);
    if (root && !root.match(/^\d/)) {
      return domainToLabel(root);
    }
  }
  // Try IP prefix
  if (ip) {
    for (const { prefix, service } of IP_SERVICE_MAP) {
      if (ip.startsWith(prefix)) return service;
    }
  }
  return '';
}

function isKnownService(hostname?: string, ip?: string): boolean {
  if (hostname) {
    const h = hostname.toLowerCase();
    if (SAFE_HOST_FRAGMENTS.some((frag) => h.includes(frag))) return true;
  }
  if (ip) {
    for (const { prefix } of IP_SERVICE_MAP) {
      if (ip.startsWith(prefix)) return true;
    }
  }
  return false;
}

export default function NetworkPage() {
  const { runtimeStatus, preferences, alerts, chatSendMessage, safelist, isDesktopRuntime } = useDashboard();
  const navigate = useNavigate();
  const networkEnabled = Boolean(preferences?.network_monitoring_enabled);
  const details = runtimeStatus?.module_details;
  const metrics = runtimeStatus?.metrics;
  const hasLiveData = Boolean(details?.network.active_connections?.length);

  const connections = useMemo<ConnectionInfo[]>(() => {
    const raw = details?.network.active_connections || [];
    const groups = new Map<string, {
      app: string;
      destination: string;
      service: string;
      protocol: string;
      port?: number;
      known: boolean;
      count: number;
    }>();

    raw.forEach((c) => {
      const dest = c.hostname || c.remote_ip || 'unknown';
      const key = dest.toLowerCase();
      const service = identifyService(c.hostname, c.remote_ip);
      const known = isKnownService(c.hostname, c.remote_ip) || Boolean(service && service !== '');
      const rawApp = c.process_name || '';
      const app = rawApp === 'unknown' ? '' : rawApp;
      const { protocol } = getProtocolInfo(c.remote_port);
      const existing = groups.get(key);

      if (existing) {
        existing.count++;
        if (!existing.app && app) existing.app = app;
        if (!existing.service && service) existing.service = service;
        if (!existing.protocol && protocol) existing.protocol = protocol;
      } else {
        groups.set(key, { app, destination: dest, service, protocol, port: c.remote_port, known, count: 1 });
      }
    });

    return Array.from(groups.entries()).map(([key, g]) => ({
      id: key,
      app: g.app || '',
      destination: g.destination,
      service: g.service || 'Unknown service',
      protocol: g.protocol || '',
      port: g.port,
      count: g.count,
      status: (g.known || g.service) ? 'safe' as const : 'unknown' as const,
    }));
  }, [details]);

  const flagged = connections.filter((c) => c.status === 'unknown' && !safelist.isSafe('hosts', c.destination));
  const verified = connections.filter((c) => c.status === 'unknown' && safelist.isSafe('hosts', c.destination));
  const safe = [...verified, ...connections.filter((c) => c.status === 'safe')];
  const totalConnections = metrics?.network_connection_count || connections.length;

  const askAboutConnection = (app: string, destination: string) => {
    chatSendMessage(`Tell me about this network connection: "${app}" is connecting to "${destination}". Is this safe? Should I be concerned?`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-haven-text">Network</h1>
        <p className="mt-1 text-sm text-haven-text-secondary">
          We monitor your internet connections for suspicious activity.
        </p>
      </div>

      {/* Status */}
      <div className="card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${networkEnabled ? 'bg-green-500/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <Wifi className={`h-5 w-5 ${networkEnabled ? 'text-green-500' : 'text-haven-text-tertiary'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-haven-text">
              Network monitoring is {networkEnabled ? 'active' : 'off'}
            </p>
            <p className="text-xs text-haven-text-tertiary">
              {networkEnabled
                ? `${totalConnections} active connection${totalConnections === 1 ? '' : 's'}`
                : 'Turn on network monitoring in Settings'}
            </p>
          </div>
        </div>
        <span className={networkEnabled ? 'status-dot-safe' : 'status-dot-inactive'} />
      </div>

      {/* Summary */}
      {networkEnabled && connections.length > 0 && (
        <div className={`card p-5 ${flagged.length > 0 ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5' : ''}`}>
          {flagged.length > 0 ? (
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-haven-text">
                {flagged.length} unrecognized destination{flagged.length === 1 ? '' : 's'} — may be normal, tap to investigate
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <p className="text-sm text-haven-text">
                All {connections.length} connection{connections.length === 1 ? '' : 's'} go to recognized services
              </p>
            </div>
          )}
        </div>
      )}

      {/* Unrecognized connections */}
      {flagged.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-haven-text">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Unrecognized ({flagged.length})
          </h2>
          <div className="space-y-2">
            {flagged.map((conn) => {
              const portInfo = getProtocolInfo(conn.port);
              return (
                <div key={conn.id} className="card border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-haven-text truncate">
                          {conn.service !== 'Unknown service' ? conn.service : conn.destination}
                        </p>
                        {conn.count > 1 && (
                          <span className="shrink-0 rounded-full bg-amber-200 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                            {conn.count}×
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-haven-text-tertiary">
                        {conn.app && (
                          <span className="flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            {conn.app}
                          </span>
                        )}
                        <span className="flex items-center gap-1 truncate">
                          <Globe className="h-3 w-3 shrink-0" />
                          {conn.destination}
                        </span>
                        {portInfo.protocol && (
                          <span className="flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            {portInfo.protocol}
                            {portInfo.desc && <span className="hidden sm:inline text-haven-text-tertiary">· {portInfo.desc}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      <button
                        onClick={() => {
                          askAboutConnection(conn.app || conn.service, conn.destination);
                          navigate('/dashboard/chat');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-haven-text-secondary transition hover:text-blue-500 hover:border-blue-500"
                        style={{ borderColor: 'var(--haven-border)' }}
                      >
                        <MessageCircle className="h-3 w-3" />
                        Ask
                      </button>
                      <button
                        onClick={() => safelist.markSafe('hosts', conn.destination)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-haven-text-secondary transition hover:text-green-500 hover:border-green-500"
                        style={{ borderColor: 'var(--haven-border)' }}
                      >
                        <ShieldCheck className="h-3 w-3" />
                        Safe
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recognized connections */}
      {safe.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-haven-text">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Recognized services ({safe.length})
          </h2>
          <div className="card divide-y" style={{ borderColor: 'var(--haven-border)' }}>
            {safe.slice(0, 30).map((conn) => {
              const portInfo = getProtocolInfo(conn.port);
              return (
                <div key={conn.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-haven-text truncate">
                        {conn.service}
                      </p>
                      {conn.count > 1 && (
                        <span className="shrink-0 rounded-full bg-haven-surface-hover px-2 py-0.5 text-[10px] font-medium text-haven-text-tertiary">
                          {conn.count}×
                        </span>
                      )}
                      {safelist.isSafe('hosts', conn.destination) && (
                        <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                          verified
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-haven-text-tertiary">
                      {conn.app && (
                        <span className="flex items-center gap-1">
                          <Server className="h-3 w-3" />
                          {conn.app}
                        </span>
                      )}
                      <span className="flex items-center gap-1 truncate">
                        <Globe className="h-3 w-3 shrink-0" />
                        {conn.destination}
                      </span>
                      {portInfo.protocol && (
                        <span className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          {portInfo.protocol}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        askAboutConnection(conn.service || conn.app, conn.destination);
                        navigate('/dashboard/chat');
                      }}
                      className="p-1.5 text-haven-text-tertiary transition hover:text-blue-500"
                      title="Ask about this connection"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    <span className="status-dot-safe" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isDesktopRuntime && !hasLiveData && (
        <div className="card p-6 text-center">
          <Server className="mx-auto h-8 w-8 text-haven-text-tertiary" />
          <p className="mt-3 text-sm font-semibold text-haven-text">Live data available in the desktop app</p>
          <p className="mt-1 text-xs text-haven-text-secondary">
            Network monitoring runs locally on your computer. Open the HavenAI desktop app to see active connections in real time.
          </p>
        </div>
      )}

      {!networkEnabled && isDesktopRuntime && (
        <div className="card p-6 text-center">
          <Wifi className="mx-auto h-8 w-8 text-haven-text-tertiary" />
          <p className="mt-3 text-sm text-haven-text-secondary">
            Enable network monitoring to see your connections.
          </p>
        </div>
      )}
    </div>
  );
}
