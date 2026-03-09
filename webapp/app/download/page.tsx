'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Download,
  Apple,
  Monitor,
  Terminal,
  CheckCircle,
  ArrowLeft,
  Cpu,
  HardDrive,
  Wifi,
} from 'lucide-react';

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
  macos: <Apple className="h-8 w-8" />,
  windows: <Monitor className="h-8 w-8" />,
  linux: <Terminal className="h-8 w-8" />,
};

const platformColors: Record<string, string> = {
  macos: 'from-gray-600 to-gray-700',
  windows: 'from-blue-600 to-blue-700',
  linux: 'from-orange-600 to-orange-700',
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-cyan-400" />
            <span className="text-2xl font-bold">HavenAI</span>
          </Link>
          <div className="space-x-4">
            <Link
              href="/"
              className="px-4 py-2 text-gray-300 hover:text-white transition inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-16 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <Download className="h-4 w-4" />
          Version {downloads?.version ?? '0.1.0'}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Download HavenAI
        </h1>
        <p className="text-lg text-gray-300 max-w-xl mx-auto">
          Install the desktop agent to start monitoring your system. It runs
          quietly in the background and keeps you safe.
        </p>
      </section>

      {/* Primary (detected) download */}
      {!loading && detectedDownload && (
        <section className="container mx-auto px-6 py-8">
          <div className="max-w-lg mx-auto bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-4 text-cyan-400">
              {platformIcons[detectedDownload.platform]}
            </div>
            <p className="text-sm text-gray-400 mb-1">
              Recommended for your system
            </p>
            <h2 className="text-2xl font-bold mb-6">
              HavenAI for {detectedDownload.label}
            </h2>

            <a
              href={detectedDownload.url}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-lg font-semibold transition"
            >
              <Download className="h-5 w-5" />
              Download for {detectedDownload.label}
            </a>

            <div className="mt-4 text-sm text-gray-500">
              {detectedDownload.filename} &middot; {detectedDownload.size}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-left text-sm">
              <div className="bg-gray-700/50 rounded-lg px-4 py-3">
                <span className="text-gray-400">Requires</span>
                <p className="text-gray-200">{detectedDownload.min_os}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg px-4 py-3">
                <span className="text-gray-400">Architecture</span>
                <p className="text-gray-200">{detectedDownload.arch}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* All / other platforms */}
      <section className="container mx-auto px-6 py-8">
        <h3 className="text-center text-lg font-semibold text-gray-400 mb-6">
          {detected ? 'Other platforms' : 'Choose your platform'}
        </h3>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {(detected ? otherPlatforms : Object.values(downloads?.platforms ?? {})).map(
            (p) => (
              <div
                key={p.platform}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col items-center text-center"
              >
                <div
                  className={`flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br ${
                    platformColors[p.platform]
                  } mb-4 text-white`}
                >
                  {platformIcons[p.platform]}
                </div>
                <h4 className="text-lg font-semibold mb-1">{p.label}</h4>
                <p className="text-sm text-gray-500 mb-4">
                  {p.size} &middot; {p.arch}
                </p>
                <a
                  href={p.url}
                  className="mt-auto inline-flex items-center gap-1.5 px-5 py-2 border border-gray-600 hover:border-cyan-500 hover:text-cyan-400 rounded-lg text-sm font-medium transition"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Setup instructions */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">
          Get started in 3 steps
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <StepCard
            step={1}
            title="Download & Install"
            description="Download HavenAI for your OS and run the installer. It takes less than a minute."
          />
          <StepCard
            step={2}
            title="Sign In"
            description="Log in with your HavenAI account so your alerts sync to the web dashboard."
          />
          <StepCard
            step={3}
            title="You're Protected"
            description="HavenAI runs in the background, monitoring files, processes, and network activity."
          />
        </div>
      </section>

      {/* What gets monitored */}
      <section className="container mx-auto px-6 py-12">
        <div className="bg-gray-800 rounded-2xl p-10 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-center mb-8">
            What the desktop agent monitors
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <HardDrive className="h-8 w-8 text-cyan-400" />
              <span className="font-medium">File Activity</span>
              <span className="text-sm text-gray-400">
                Downloads, new executables, suspicious file names
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Cpu className="h-8 w-8 text-cyan-400" />
              <span className="font-medium">Processes</span>
              <span className="text-sm text-gray-400">
                New process spawns, unusual parent-child chains
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Wifi className="h-8 w-8 text-cyan-400" />
              <span className="font-medium">Network</span>
              <span className="text-sm text-gray-400">
                Suspicious connections, unusual ports, data exfiltration
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* System requirements */}
      <section className="container mx-auto px-6 py-12 pb-20">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-center text-gray-400 mb-6">
            System requirements
          </h3>
          <div className="grid gap-3 text-sm">
            {[
              { label: 'macOS', value: 'macOS 12 (Monterey) or later, Intel or Apple Silicon' },
              { label: 'Windows', value: 'Windows 10 64-bit or later, 4 GB RAM' },
              { label: 'Linux', value: 'Ubuntu 20.04+ / Fedora 34+, x64, 4 GB RAM' },
            ].map((req) => (
              <div
                key={req.label}
                className="flex items-start gap-3 bg-gray-800/60 rounded-lg px-4 py-3"
              >
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">{req.label}</span>
                  <span className="text-gray-400"> &mdash; {req.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-cyan-400" />
            <span className="font-semibold">HavenAI</span>
          </div>
          <div className="text-gray-400 text-sm">
            &copy; 2024 HavenAI. University of Miami Senior Design Project.
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500 text-white font-bold text-lg mb-4">
        {step}
      </div>
      <h4 className="text-lg font-semibold mb-2">{title}</h4>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
