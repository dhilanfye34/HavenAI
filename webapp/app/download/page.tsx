'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  Apple,
  Monitor,
  Terminal,
  CheckCircle,
  Cpu,
  HardDrive,
  Wifi,
  ArrowRight,
  Sparkles,
  Info,
  MousePointerClick,
} from 'lucide-react';
import ShieldLock from '../components/ShieldLock';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ShaderHeroCanvas } from '../components/ShaderHeroCanvas';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

const platformColors: Record<string, { border: string; glow: string; text: string; bg: string }> = {
  macos: { border: 'border-violet-500/20', glow: 'rgba(139, 92, 246, 0.08)', text: 'text-violet-400', bg: 'bg-violet-500/10' },
  windows: { border: 'border-cyan-500/20', glow: 'rgba(34, 211, 238, 0.08)', text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  linux: { border: 'border-amber-500/20', glow: 'rgba(245, 158, 11, 0.08)', text: 'text-amber-400', bg: 'bg-amber-500/10' },
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
          version: '0.1.0',
          platforms: {
            macos: {
              platform: 'macos',
              label: 'macOS',
              filename: 'HavenAI-0.1.0.dmg',
              url: '#',
              size: '85 MB',
              min_os: 'macOS 12 (Monterey)',
              arch: 'Universal (Intel + Apple Silicon)',
            },
            windows: {
              platform: 'windows',
              label: 'Windows',
              filename: 'HavenAI-Setup-0.1.0.exe',
              url: '#',
              size: '78 MB',
              min_os: 'Windows 10 (64-bit)',
              arch: 'x64',
            },
            linux: {
              platform: 'linux',
              label: 'Linux',
              filename: 'HavenAI-0.1.0.AppImage',
              url: '#',
              size: '90 MB',
              min_os: 'Ubuntu 20.04+ / Fedora 34+',
              arch: 'x64',
            },
          },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const detectedDownload = detected && downloads?.platforms[detected];
  const otherPlatforms = downloads
    ? Object.values(downloads.platforms).filter((p) => p.platform !== detected)
    : [];

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-white">
      {/* Shader background behind hero only */}
      <div className="absolute top-0 left-0 h-[70vh] w-full" style={{ zIndex: 0 }}>
        <ShaderHeroCanvas className="opacity-30" />
      </div>
      <div className="pointer-events-none absolute top-[40vh] left-0 h-[30vh] w-full bg-gradient-to-b from-transparent to-[#0a0a0f]" style={{ zIndex: 0 }} />

      <div className="relative" style={{ zIndex: 1 }}>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-16">
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="section-badge mb-6 justify-center">
            <Download className="h-4 w-4" />
            Version {downloads?.version ?? '0.1.0'}
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

      {/* Detected platform — primary download */}
      {!loading && detectedDownload && (
        <section className="mx-auto max-w-xl px-6 pb-8">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center">
            {/* Subtle glow */}
            <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl" style={{ background: platformColors[detectedDownload.platform]?.glow }} />

            <div className={`relative mb-3 inline-flex rounded-2xl ${platformColors[detectedDownload.platform]?.bg} p-4 ${platformColors[detectedDownload.platform]?.text}`}>
              {platformIcons[detectedDownload.platform]}
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Recommended for your system
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              HavenAI for {detectedDownload.label}
            </h2>

            <a href={detectedDownload.url} className="btn-primary mt-6 gap-2">
              <Download className="h-5 w-5" />
              Download for {detectedDownload.label}
            </a>

            <p className="mt-3 text-xs text-gray-500">
              {detectedDownload.filename} &middot; {detectedDownload.size}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-sm">
                <p className="text-xs text-gray-500">Requires</p>
                <p className="text-gray-300">{detectedDownload.min_os}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-sm">
                <p className="text-xs text-gray-500">Architecture</p>
                <p className="text-gray-300">{detectedDownload.arch}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Private beta notice — macOS Gatekeeper warning workaround */}
      <section className="mx-auto max-w-xl px-6 pb-2">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Info className="h-4 w-4 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-300">Private beta · macOS install note</p>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
                HavenAI is in private beta and the macOS build isn&rsquo;t notarized yet. The first
                time you open it, macOS will say it can&rsquo;t verify the developer. This is expected
                — here&rsquo;s how to get past it:
              </p>
              <ol className="mt-3 space-y-2 text-xs text-gray-400">
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-300">
                    1
                  </span>
                  <span className="pt-0.5">Open your Downloads folder and double-click <span className="font-mono text-amber-200">HavenAI.dmg</span> to mount it.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-300">
                    2
                  </span>
                  <span className="pt-0.5">Drag HavenAI into your Applications folder.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-300">
                    3
                  </span>
                  <span className="pt-0.5">
                    Open Applications, <span className="inline-flex items-center gap-1 font-medium text-amber-200">
                      <MousePointerClick className="h-3 w-3" /> right-click
                    </span> (or Control-click) HavenAI, and choose <span className="font-medium text-amber-200">Open</span>.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-300">
                    4
                  </span>
                  <span className="pt-0.5">
                    In the dialog that appears, click <span className="font-medium text-amber-200">Open</span> again. From then on, double-clicking works normally.
                  </span>
                </li>
              </ol>
              <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
                Why this happens: Apple requires paid developer certificates to skip this warning.
                We&rsquo;re finalizing ours — future releases will install without any extra steps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Other platforms */}
      <section className="mx-auto max-w-4xl px-6 py-8">
        <h3 className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-gray-500">
          {detected ? 'Other platforms' : 'Choose your platform'}
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {(detected ? otherPlatforms : Object.values(downloads?.platforms ?? {})).map((p) => {
            const colors = platformColors[p.platform];
            return (
              <div key={p.platform} className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]`}>
                <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" style={{ background: colors?.glow }} />
                <div className={`relative mb-4 inline-flex rounded-2xl ${colors?.bg} p-3.5 ${colors?.text}`}>
                  {platformIcons[p.platform]}
                </div>
                <h4 className="text-lg font-semibold">{p.label}</h4>
                <p className="mt-1 text-xs text-gray-500">
                  {p.size} &middot; {p.arch}
                </p>
                <a
                  href={p.url}
                  className="btn-secondary mt-4 gap-1.5 !px-5 !py-2 text-sm"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Setup steps */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-14 text-center text-2xl font-bold tracking-tight md:text-3xl">
            Get started in <span className="text-gradient">3 steps</span>
          </h2>
          <div className="relative grid gap-6 md:grid-cols-3">
            {/* Connection line behind steps */}
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
