'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  Brain,
  CheckCircle2,
  Cpu,
  Eye,
  FileSearch,
  Lock,
  Mail,
  MessageCircle,
  Network,
  Phone,
  Sparkles,
  Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ShieldLock from '../components/ShieldLock';

type FeatureItem = { icon: LucideIcon; label: string; desc: string };

type Step = {
  id: string;
  headline: string;
  subhead?: string;
  description?: string;
  visual?: React.ComponentType<{ className?: string }>;
  features?: FeatureItem[];
  bullets?: { icon: LucideIcon; text: string }[];
};

const STEPS: Step[] = [
  {
    id: 'welcome',
    headline: 'Meet HavenAI',
    subhead: 'Enterprise-grade security, made for one person.',
    description:
      'Big companies spend millions on tools that watch their systems for threats. HavenAI brings that same kind of protection to your personal computer — running quietly in the background, learning what\u2019s normal for you, and alerting you the moment something isn\u2019t.',
    visual: ShieldLock,
  },
  {
    id: 'features',
    headline: 'Four areas, always watching',
    subhead: 'HavenAI runs five coordinated AI agents on your device.',
    features: [
      {
        icon: FileSearch,
        label: 'Files',
        desc: 'Detects unauthorized changes, ransomware-like bulk edits, and suspicious writes to system folders.',
      },
      {
        icon: Eye,
        label: 'Apps & processes',
        desc: 'Spots unknown programs spinning up CPU, hidden background tasks, and apps you didn\u2019t install.',
      },
      {
        icon: Wifi,
        label: 'Network',
        desc: 'Watches outbound connections for unfamiliar hosts, suspicious domains, and data leaving your device.',
      },
      {
        icon: Mail,
        label: 'Email',
        desc: 'Scans your inbox for phishing, spoofed senders, credential-stealing links, and scam patterns.',
      },
    ],
  },
  {
    id: 'how-it-works',
    headline: 'How HavenAI thinks',
    subhead: 'Five specialized agents, one coordinator.',
    description:
      'Each agent is an expert in its own domain — files, processes, network, email, and alerts. A central coordinator combines their findings so a suspicious download that spawns an unknown process and opens a new network connection is flagged as one correlated threat, not three unrelated blips.',
    bullets: [
      { icon: Brain, text: 'Scoring uses heuristics tuned on real phishing, malware, and intrusion patterns.' },
      { icon: Sparkles, text: 'A safelist learns what\u2019s normal for you, so alerts stay relevant and quiet.' },
      { icon: MessageCircle, text: 'Ask the built-in assistant about any alert to get a plain-English explanation and next steps.' },
    ],
    visual: Cpu,
  },
  {
    id: 'privacy',
    headline: 'Your data never leaves your device',
    subhead: 'Local-first by design.',
    description:
      'Every scan, score, and decision happens on your computer. Your files, email contents, browsing history, and app activity are analyzed inside HavenAI — the cloud never sees them.',
    bullets: [
      { icon: Lock, text: 'Email passwords stored in your OS keychain (macOS Keychain / Windows DPAPI), never in plaintext.' },
      { icon: Network, text: 'Only the alerts you generate are synced to the cloud, and only so you can see them here.' },
      { icon: ShieldLock as unknown as LucideIcon, text: 'No telemetry, no analytics, no ad tracking — ever.' },
    ],
    visual: Lock,
  },
  {
    id: 'alerts',
    headline: 'How you\u2019ll hear about threats',
    subhead: 'Loud when it matters, silent when it doesn\u2019t.',
    description:
      'HavenAI will reach you through the channels you choose. Turn these on in Settings whenever you\u2019re ready — SMS and voice calls are for critical alerts only.',
    bullets: [
      { icon: Bell, text: 'Native desktop notifications for anything flagged as warning or above.' },
      { icon: Mail, text: 'Email summaries sent to your account address when new threats appear.' },
      { icon: Phone, text: 'Optional SMS and automated voice calls for critical alerts you can\u2019t miss.' },
    ],
    visual: Bell,
  },
  {
    id: 'ready',
    headline: 'You\u2019re ready to go',
    subhead: 'Here\u2019s what to do next.',
    description:
      'HavenAI is already watching your files, apps, and network. A few quick steps will unlock the rest.',
    bullets: [
      { icon: CheckCircle2, text: 'Grant file, process, and network permissions when prompted — that\u2019s what turns monitoring on.' },
      { icon: Mail, text: 'Connect your email (Gmail, iCloud, or Yahoo work best) to enable phishing scanning.' },
      { icon: MessageCircle, text: 'Open the chat anytime to ask about an alert, a process, or a suspicious domain.' },
    ],
    visual: CheckCircle2,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('haven-onboarded', 'true');
      router.push('/dashboard');
    }
  };

  const skip = () => {
    localStorage.setItem('haven-onboarded', 'true');
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-haven-bg px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-blue-500' : i < step ? 'w-2 bg-blue-300' : 'w-2 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="card p-8 md:p-10 text-center animate-fade-in" key={current.id}>
          {/* Header visual */}
          {current.visual && (
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10">
                <current.visual className={`h-8 w-8 ${current.id === 'ready' ? 'text-green-500' : 'text-blue-500'}`} />
              </div>
            </div>
          )}

          <h1 className="text-2xl md:text-3xl font-bold text-haven-text">{current.headline}</h1>

          {current.subhead && (
            <p className="mt-2 text-sm font-medium text-blue-500">{current.subhead}</p>
          )}

          {current.description && (
            <p className="mt-4 text-sm md:text-[15px] leading-relaxed text-haven-text-secondary">
              {current.description}
            </p>
          )}

          {/* Features grid (step 2) */}
          {current.features && (
            <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
              {current.features.map((f) => (
                <div
                  key={f.label}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: 'var(--haven-surface)' }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <f.icon className="h-[18px] w-[18px] text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-haven-text">{f.label}</p>
                    <p className="text-xs text-haven-text-secondary leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bullet list (steps 3-6) */}
          {current.bullets && (
            <ul className="mt-6 space-y-3 text-left">
              {current.bullets.map((b, i) => {
                const Icon = b.icon;
                return (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-xl p-3"
                    style={{ background: 'var(--haven-surface)' }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                      <Icon className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-xs md:text-sm text-haven-text-secondary leading-relaxed pt-0.5">
                      {b.text}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <button onClick={next} className="btn-primary w-full">
              {step === STEPS.length - 1 ? 'Go to Dashboard' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </button>
            {step < STEPS.length - 1 && (
              <button
                onClick={skip}
                className="w-full text-sm text-haven-text-tertiary transition hover:text-haven-text"
              >
                Skip intro
              </button>
            )}
          </div>
        </div>

        {/* Step counter */}
        <p className="mt-6 text-center text-xs text-haven-text-tertiary">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
