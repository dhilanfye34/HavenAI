'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FileSearch,
  Mail,
  Wifi,
} from 'lucide-react';
import ShieldLock from '../components/ShieldLock';

const STEPS = [
  {
    id: 'welcome',
    headline: 'Welcome to HavenAI',
    description:
      'Your personal security guardian. We watch over your files, apps, and internet connections so you don\'t have to.',
    visual: ShieldLock,
  },
  {
    id: 'features',
    headline: "Here's what HavenAI watches for you",
    features: [
      { icon: FileSearch, label: 'Files', desc: 'Watch for unauthorized changes to your files' },
      { icon: Eye, label: 'Apps', desc: 'Flag suspicious apps running on your computer' },
      { icon: Wifi, label: 'Network', desc: 'Monitor your internet connections' },
      { icon: Mail, label: 'Email', desc: 'Scan for phishing and suspicious emails' },
    ],
  },
  {
    id: 'privacy',
    headline: 'Your data stays private',
    description:
      'HavenAI runs entirely on your computer. Your files, emails, and activity are analyzed locally — nothing is sent to the cloud unless you choose to enable alerts.',
    visual: ShieldLock,
  },
  {
    id: 'ready',
    headline: "You're all set",
    description:
      'HavenAI is now watching over your device. We\'ll let you know if anything needs your attention.',
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
    <div className="flex min-h-screen items-center justify-center bg-haven-bg px-4">
      <div className="w-full max-w-md">
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

        <div className="card p-8 text-center animate-fade-in" key={current.id}>
          {/* Welcome / Privacy / Ready screens */}
          {current.visual && (
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10">
                <current.visual className={`h-8 w-8 ${current.id === 'ready' ? 'text-green-500' : 'text-blue-500'}`} />
              </div>
            </div>
          )}

          <h1 className="text-2xl font-bold text-haven-text">{current.headline}</h1>

          {current.description && (
            <p className="mt-4 text-sm leading-relaxed text-haven-text-secondary">
              {current.description}
            </p>
          )}

          {/* Features screen */}
          {current.features && (
            <div className="mt-6 space-y-3 text-left">
              {current.features.map((f) => (
                <div key={f.label} className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'var(--haven-surface)' }}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <f.icon className="h-[18px] w-[18px] text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-haven-text">{f.label}</p>
                    <p className="text-xs text-haven-text-secondary">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
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
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
