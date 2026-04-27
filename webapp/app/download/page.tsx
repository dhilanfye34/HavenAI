'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  Apple,
  Monitor,
  Terminal,
  CheckCircle,
  Cpu,
  HardDrive,
  Wifi,
} from 'lucide-react';
import ShieldLock from '../components/ShieldLock';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ShaderHeroCanvas } from '../components/ShaderHeroCanvas';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FALLBACK_VERSION = '0.1.5';
const FALLBACK_RELEASE_BASE = `https://github.com/dhilanfye34/HavenAI/releases/download/v${FALLBACK_VERSION}`;

interface PlatformDownload {
  platform: string;
  label: string;
  filename: string;
  url: string;
  size: string;
  min_os: string;
  arch: string;
}

interface DownloadsData {
  version: string;
  platforms: Record<string, PlatformDownload>;
}

type DetectedPlatform = 'macos' | 'windows' | 'linux' | null;

function detectPlatform(): DetectedPlatform {
  if (typeof window === 'undefined') return null;
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('win')) return 'windows';
  if (ua.includes('linux')) return 'linux';
  return null;
}

const platformIcons: Record<string, React.ReactNode> = {
  macos: <Apple className="h-7 w-7" />,
  windows: <Monitor className="h-7 w-7" />,
  linux: <Terminal className="h-7 w-7" />,
};

const platformIconsLarge: Record<string, React.ReactNode> = {
  macos: <Apple className="h-10 w-10" />,
  windows: <Monitor className="h-10 w-10" />,
  linux: <Terminal className="h-10 w-10" />,
};

const platformColors: Record<
  string,
  { border: string; glow: string; text: string; bg: string; gradient: string }
> = {
  macos: {
    border: 'border-violet-500/25',
    glow: 'rgba(139, 92, 246, 0.18)',
    text: 'text-violet-300',
    bg: 'bg-violet-500/10',
    gradient: 'from-violet-500/20 via-purple-500/10 to-transparent',
  },
  windows: {
    border: 'border-cyan-500/25',
    glow: 'rgba(34, 211, 238, 0.18)',
    text: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
  },
  linux: {
    border: 'border-amber-500/25',
    glow: 'rgba(245, 158, 11, 0.18)',
    text: 'text-amber-300',
    bg: 'bg-amber-500/10',
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
  },
};

export default function DownloadPage() {
  const [downloads, setDownloads] = useState<DownloadsData | null>(null);
  const [detected, setDetected] = useState<DetectedPlatform>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setDetected(detectPlatform());
    fetch(`${API_URL}/downloads`)
      .then((res) => res.json())
      .then((data) => setDownloads(data))
      .catch(() => {
        setDownloads({
          version: FALLBACK_VERSION,
          platforms: {
            macos: {
              platform: 'macos',
              label: 'macOS',
              filename: `HavenAI-${FALLBACK_VERSION}-arm64.dmg`,
              url: `${FALLBACK_RELEASE_BASE}/HavenAI-${FALLBACK_VERSION}-arm64.dmg`,
              size: '130 MB',
              min_os: 'macOS 12 (Monterey)',
              arch: 'Apple Silicon (M1+) · Intel via Rosetta',
            },
            windows: {
              platform: 'windows',
              label: 'Windows',
              filename: `HavenAI-Setup-${FALLBACK_VERSION}.exe`,
              url: `${FALLBACK_RELEASE_BASE}/HavenAI-Setup-${FALLBACK_VERSION}.exe`,
              size: '78 MB',
              min_os: 'Windows 10 (64-bit)',
              arch: 'x64',
            },
            linux: {
              platform: 'linux',
              label: 'Linux',
              filename: `HavenAI-${FALLBACK_VERSION}.AppImage`,
              url: `${FALLBACK_RELEASE_BASE}/HavenAI-${FALLBACK_VERSION}.AppImage`,
              size: '90 MB',
              min_os: 'Ubuntu 20.04+ / Fedora 34+',
              arch: 'x64',
            },
          },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const allPlatforms = downloads ? Object.values(downloads.platforms) : [];
  const platformOrder = ['macos', 'windows', 'linux'];
  const sortedPlatforms = [...allPlatforms].sort(
    (a, b) => platformOrder.indexOf(a.platform) - platformOrder.indexOf(b.platform)
  );
  const detectedPlatform = detected ? sortedPlatforms.find((p) => p.platform === detected) : null;
  const otherPlatforms = detectedPlatform
    ? sortedPlatforms.filter((p) => p.platform !== detected)
    : sortedPlatforms;

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-white">
      {/* Shader background behind hero only */}
      <div className="absolute top-0 left-0 h-[70vh] w-full" style={{ zIndex: 0 }}>
        <ShaderHeroCanvas className="opacity-30" />
      </div>
      <div
        className="pointer-events-none absolute top-[40vh] left-0 h-[30vh] w-full bg-gradient-to-b from-transparent to-[#0a0a0f]"
        style={{ zIndex: 0 }}
      />

      <div className="relative" style={{ zIndex: 1 }}>
        <Navbar />

        {/* Hero */}
        <section className="relative overflow-hidden pt-32 pb-12">
          <div className="relative mx-auto max-w-4xl px-6 text-center">
            <div className="section-badge mb-6 justify-center">
              <Download className="h-4 w-4" />
              Version {downloads?.version ?? FALLBACK_VERSION}
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Download <span className="text-gradient">HavenAI</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-gray-400">
              Install the desktop agent to start monitoring your system. It runs
              quietly in the background and keeps you safe.
            </p>
          </div>
        </section>

        {/* Detected platform — hero card */}
        {!loading && detectedPlatform && (
          <section className="mx-auto max-w-3xl px-6 pb-6">
            <DetectedPlatformCard platform={detectedPlatform} />
          </section>
        )}

        {/* Other platforms — normal cards */}
        {!loading && otherPlatforms.length > 0 && (
          <section className="mx-auto max-w-5xl px-6 py-8">
            {detectedPlatform && (
              <h2 className="mb-5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                Other platforms
              </h2>
            )}
            <div
              className={`grid gap-4 ${
                otherPlatforms.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'
              }`}
            >
              {otherPlatforms.map((p) => (
                <CompactPlatformCard key={p.platform} platform={p} />
              ))}
            </div>
          </section>
        )}

        {/* Setup steps */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="mb-14 text-center text-2xl font-bold tracking-tight md:text-3xl">
              Get started in <span className="text-gradient">3 steps</span>
            </h2>
            <div className="relative grid gap-6 md:grid-cols-3">
              <div className="pointer-events-none absolute top-8 left-[16.67%] right-[16.67%] hidden h-px bg-gradient-to-r from-violet-500/20 via-cyan-500/20 to-emerald-500/20 md:block" />

              {[
                { step: 1, title: 'Download & Install', desc: 'Download HavenAI for your OS and run the installer. Takes less than a minute.', color: 'from-violet-500 to-purple-600' },
                { step: 2, title: 'Sign In', desc: 'Log in with your HavenAI account so alerts sync to the web dashboard.', color: 'from-cyan-500 to-blue-600' },
                { step: 3, title: "You're Protected", desc: 'HavenAI runs in the background, monitoring files, processes, and network.', color: 'from-emerald-500 to-teal-600' },
              ].map(({ step, title, desc, color }) => (
                <div key={step} className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
                  <div className={`relative mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${color} text-sm font-bold text-white shadow-lg`}>
                    {step}
                  </div>
                  <h4 className="mb-2 text-base font-semibold text-white">{title}</h4>
                  <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What gets monitored */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10">
              <div className="mb-2 flex justify-center">
                <div className="section-badge mb-4">
                  <ShieldLock className="h-4 w-4" />
                  Coverage
                </div>
              </div>
              <h3 className="mb-8 text-center text-xl font-bold">
                What the desktop agent monitors
              </h3>
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  { icon: HardDrive, label: 'File Activity', desc: 'Downloads, new executables, suspicious file names', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                  { icon: Cpu, label: 'Processes', desc: 'New spawns, unusual parent-child chains', color: 'text-violet-400', bg: 'bg-violet-500/10' },
                  { icon: Wifi, label: 'Network', desc: 'Suspicious connections, unusual ports', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                ].map(({ icon: Icon, label, desc, color, bg }) => (
                  <div key={label} className="flex flex-col items-center gap-3 text-center">
                    <div className={`inline-flex rounded-xl ${bg} p-3 ${color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="font-medium text-white">{label}</span>
                    <span className="text-xs leading-relaxed text-gray-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* System requirements */}
        <section className="py-12 pb-24">
          <div className="mx-auto max-w-2xl px-6">
            <h3 className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-gray-500">
              System requirements
            </h3>
            <div className="space-y-3">
              {[
                { label: 'macOS', value: 'macOS 12 (Monterey) or later, Intel or Apple Silicon', platform: 'macos' },
                { label: 'Windows', value: 'Windows 10 64-bit or later, 4 GB RAM', platform: 'windows' },
                { label: 'Linux', value: 'Ubuntu 20.04+ / Fedora 34+, x64, 4 GB RAM', platform: 'linux' },
              ].map((req) => (
                <div
                  key={req.label}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm"
                >
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <div>
                    <span className="font-medium text-white">{req.label}</span>
                    <span className="text-gray-500"> — {req.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}

/* ─────────── Detected platform — featured hero card ─────────── */
function DetectedPlatformCard({ platform }: { platform: PlatformDownload }) {
  const colors = platformColors[platform.platform];

  return (
    <div className="group relative">
      <div
        className={`relative overflow-hidden rounded-3xl border ${colors.border} bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-white/[0.04] backdrop-blur-xl transition-all duration-500 hover:border-white/20`}
      >
        {/* Inner accent gradient */}
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-60 transition-opacity duration-500 group-hover:opacity-100`}
        />

        {/* Soft glow orb behind icon */}
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl transition-all duration-700 group-hover:scale-110"
          style={{ background: colors.glow }}
        />

        {/* Subtle diagonal shimmer on hover */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
        </div>

        {/* Corner accents */}
        <div className="pointer-events-none absolute top-0 left-0 h-24 w-24 rounded-br-3xl bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 rounded-tl-3xl bg-gradient-to-tl from-white/[0.05] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative z-10 flex flex-col items-center p-10 text-center md:p-12">
          {/* Icon with subtle ring + scale on hover */}
          <div className="relative mb-3 inline-flex">
            <div
              className={`absolute inset-0 rounded-2xl border ${colors.border} opacity-60`}
              style={{ transform: 'scale(1.15)' }}
            />
            <div
              className={`relative inline-flex rounded-2xl ${colors.bg} p-5 ${colors.text} shadow-2xl transition-transform duration-500 group-hover:scale-105`}
            >
              {platformIconsLarge[platform.platform]}
            </div>
          </div>

          {/* Detected badge — sits under icon, smaller */}
          <div className="mb-5 inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
            <CheckCircle className="h-2.5 w-2.5" />
            Detected OS
          </div>

          {/* Title */}
          <h2 className="mb-2 text-4xl font-bold tracking-tight md:text-5xl">
            <span className="text-gradient">{platform.label}</span>
          </h2>

          <p className="mb-1 text-sm text-gray-400">{platform.filename}</p>
          <p className="mb-7 text-xs text-gray-500">{platform.size}</p>

          {/* CTA */}
          <a
            href={platform.url}
            className="group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-white/10 active:scale-[0.98]"
          >
            <Download className="h-4 w-4 transition-transform duration-300 group-hover/btn:-translate-y-0.5" />
            Download for {platform.label}
          </a>

          {/* Specs grid */}
          <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-center backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Requires</p>
              <p className="mt-1 text-xs font-medium text-gray-200">{platform.min_os}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-center backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Architecture</p>
              <p className="mt-1 text-xs font-medium text-gray-200">{platform.arch}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Other platforms — compact cards ─────────── */
function CompactPlatformCard({ platform }: { platform: PlatformDownload }) {
  const colors = platformColors[platform.platform];

  return (
    <a
      href={platform.url}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.04]"
    >
      {/* Soft hover glow */}
      <div
        className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-60"
        style={{ background: colors.glow }}
      />

      <div
        className={`relative inline-flex shrink-0 rounded-xl ${colors.bg} p-3 ${colors.text} transition-transform duration-300 group-hover:scale-110`}
      >
        {platformIcons[platform.platform]}
      </div>

      <div className="relative flex-1 min-w-0">
        <p className="text-base font-semibold text-white">{platform.label}</p>
        <p className="truncate text-xs text-gray-500">
          {platform.size} · {platform.arch}
        </p>
      </div>

      <div className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-gray-400 transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/[0.08] group-hover:text-white">
        <Download className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
      </div>
    </a>
  );
}
