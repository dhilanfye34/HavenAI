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
} from 'lucide-react';
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
      <ShaderHeroCanvas className="opacity-40 fixed" />
      <div className="relative" style={{ zIndex: 1 }}>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-12">
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

      {/* Detected platform download */}
      {!loading && detectedDownload && (
        <section className="mx-auto max-w-lg px-6 py-8">
          <div className="glass-card p-8 text-center">
            <div className="mb-4 flex justify-center text-cyan-400">
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

            <p className="mt-3 text-xs text-gray-600">
              {detectedDownload.filename} &middot; {detectedDownload.size}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm">
                <p className="text-xs text-gray-500">Requires</p>
                <p className="text-gray-200">{detectedDownload.min_os}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm">
                <p className="text-xs text-gray-500">Architecture</p>
                <p className="text-gray-200">{detectedDownload.arch}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Other platforms */}
      <section className="mx-auto max-w-4xl px-6 py-8">
        <h3 className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-gray-500">
          {detected ? 'Other platforms' : 'Choose your platform'}
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {(detected ? otherPlatforms : Object.values(downloads?.platforms ?? {})).map((p) => (
            <div key={p.platform} className="glass-card-hover flex flex-col items-center p-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-cyan-400">
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
          ))}
        </div>
      </section>

      {/* Setup steps */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-12 text-center text-2xl font-bold tracking-tight">
            Get started in <span className="text-gradient">3 steps</span>
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: 1, title: 'Download & Install', desc: 'Download HavenAI for your OS and run the installer. Takes less than a minute.' },
              { step: 2, title: 'Sign In', desc: 'Log in with your HavenAI account so alerts sync to the web dashboard.' },
              { step: 3, title: "You're Protected", desc: 'HavenAI runs in the background, monitoring files, processes, and network.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-bold text-white">
                  {step}
                </div>
                <h4 className="mb-2 font-semibold text-white">{title}</h4>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What gets monitored */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="glass-card p-10">
            <h3 className="mb-8 text-center text-lg font-bold">
              What the desktop agent monitors
            </h3>
            <div className="grid gap-6 text-center md:grid-cols-3">
              <div className="flex flex-col items-center gap-2">
                <HardDrive className="h-7 w-7 text-cyan-400" />
                <span className="font-medium">File Activity</span>
                <span className="text-xs text-gray-500">Downloads, new executables, suspicious file names</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Cpu className="h-7 w-7 text-violet-400" />
                <span className="font-medium">Processes</span>
                <span className="text-xs text-gray-500">New spawns, unusual parent-child chains</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Wifi className="h-7 w-7 text-emerald-400" />
                <span className="font-medium">Network</span>
                <span className="text-xs text-gray-500">Suspicious connections, unusual ports</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System requirements */}
      <section className="py-12 pb-20">
        <div className="mx-auto max-w-2xl px-6">
          <h3 className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-gray-500">
            System requirements
          </h3>
          <div className="space-y-3">
            {[
              { label: 'macOS', value: 'macOS 12 (Monterey) or later, Intel or Apple Silicon' },
              { label: 'Windows', value: 'Windows 10 64-bit or later, 4 GB RAM' },
              { label: 'Linux', value: 'Ubuntu 20.04+ / Fedora 34+, x64, 4 GB RAM' },
            ].map((req) => (
              <div
                key={req.label}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm"
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
