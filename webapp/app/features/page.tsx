import Link from 'next/link';
import {
  FileSearch,
  Cpu,
  Wifi,
  Mail,
  Bell,
  Shield,
  ArrowRight,
  Activity,
  Lock,
  Eye,
  Zap,
  BarChart3,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { DottedSurface } from '../components/DottedSurface';

const CORE_AGENTS = [
  {
    icon: FileSearch,
    name: 'File Monitor Agent',
    description: 'Continuously watches your file system for new downloads, suspicious executables, integrity changes, and anomalous file activity. Alerts are generated in real-time as events occur.',
    highlights: ['Download folder monitoring', 'Executable detection', 'File integrity checks', 'Extension analysis'],
    color: 'text-blue-400',
    bg: 'bg-blue-500/[0.08]',
  },
  {
    icon: Cpu,
    name: 'Process Monitor Agent',
    description: 'Tracks new process spawns, suspicious parent-child process chains, and identifies resource-heavy applications. Detects processes that may indicate malware or unauthorized activity.',
    highlights: ['Process spawn tracking', 'Parent-child chain analysis', 'CPU/memory monitoring', 'Suspicious behavior flags'],
    color: 'text-violet-400',
    bg: 'bg-violet-500/[0.08]',
  },
  {
    icon: Wifi,
    name: 'Network Monitor Agent',
    description: 'Monitors all inbound and outbound network connections. Detects unusual ports, potential data exfiltration, connections to suspicious hosts, and unexpected network activity.',
    highlights: ['Connection monitoring', 'Port analysis', 'DNS resolution tracking', 'Exfiltration detection'],
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/[0.08]',
  },
  {
    icon: Mail,
    name: 'Email Inbox Agent',
    description: 'Connects to your email via IMAP and monitors for phishing attempts, suspicious attachments, and unusual sending patterns that may indicate account compromise.',
    highlights: ['Phishing detection', 'Attachment scanning', 'Sender analysis', 'Pattern recognition'],
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/[0.08]',
  },
  {
    icon: Bell,
    name: 'Alert Dispatch Agent',
    description: 'Routes critical security alerts through multiple channels — email, SMS text messages, and automated phone calls — ensuring you never miss a high-priority threat notification.',
    highlights: ['Multi-channel delivery', 'Severity-based routing', 'SMS notifications', 'Voice call alerts'],
    color: 'text-amber-400',
    bg: 'bg-amber-500/[0.08]',
  },
];

const PLATFORM_FEATURES = [
  { icon: Shield, label: 'AI Command Center', desc: 'Real-time dashboard with live triage, health scoring, and an AI security assistant.' },
  { icon: Activity, label: 'Runtime Inspector', desc: 'Full live view of file, process, and network activity with filterable timeline.' },
  { icon: Lock, label: 'Privacy-First Design', desc: 'All monitoring runs locally. Your data never touches external servers.' },
  { icon: Eye, label: 'Behavioral Baseline', desc: 'Learns your patterns over time to reduce false positives and improve accuracy.' },
  { icon: Zap, label: 'Instant Detection', desc: 'Sub-second threat detection with real-time alert generation and routing.' },
  { icon: BarChart3, label: 'Health Scoring', desc: 'Dynamic security health score based on coverage, threats, and system stability.' },
];

export default function FeaturesPage() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-white">
      <DottedSurface className="opacity-40" />
      <div className="relative" style={{ zIndex: 1 }}>
      <Navbar />

      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="stars-field -z-10" />
        <div className="hero-orb -z-10" style={{ top: '30%', opacity: 0.35 }} />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="section-badge mb-6 justify-center">Features</div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            Agents &amp;{' '}
            <span className="text-gradient">Capabilities</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
            Five coordinated AI agents and a powerful command center working together 
            to provide comprehensive cybersecurity protection.
          </p>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="section-badge mb-6 justify-center">Core Agents</div>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Five Specialized Agents
            </h2>
          </div>
          <div className="space-y-5">
            {CORE_AGENTS.map(({ icon: Icon, name, description, highlights, color, bg }) => (
              <div key={name} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-all duration-300 hover:border-white/[0.12]">
                <div className="grid gap-6 p-7 md:grid-cols-[auto_1fr_auto]">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${bg} ${color}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-white">{name}</h3>
                    <p className="text-sm leading-relaxed text-gray-400">{description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 md:flex-col md:gap-1.5">
                    {highlights.map((h) => (
                      <span
                        key={h}
                        className="inline-flex rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs text-gray-500"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24">
        <div className="bg-top-glow absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <div className="section-badge mb-6 justify-center">Platform</div>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Platform Capabilities
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
                <div className="mb-4 inline-flex rounded-xl bg-white/[0.05] p-3 text-violet-400 transition-colors group-hover:text-violet-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-white">{label}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Start Protecting Yourself</h2>
          <p className="mt-5 text-lg text-gray-400">
            Download HavenAI and experience next-generation personal cybersecurity.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/download" className="btn-primary gap-2">
              Download
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  );
}
