import Link from 'next/link';
import {
  Shield,
  FileSearch,
  Cpu,
  Wifi,
  Mail,
  Bell,
  ArrowRight,
  ArrowUpRight,
  Zap,
  Lock,
  Brain,
  Eye,
  BarChart3,
  Activity,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ShaderBackground } from './components/ShaderBackground';
import { SmokeBackground } from './components/SmokeBackground';

const BENEFITS = [
  {
    icon: Brain,
    title: 'Behavioral Intelligence',
    description: 'AI builds a personalized baseline of your activity, learning what\'s normal to detect what isn\'t — reducing false positives over time.',
  },
  {
    icon: Eye,
    title: 'Real-Time Detection',
    description: 'Sub-second threat detection across files, processes, and network connections with instant alerting through multiple channels.',
  },
  {
    icon: Lock,
    title: '100% Privacy',
    description: 'All analysis runs locally on your machine. Your data never leaves your device — no cloud dependency for threat detection.',
  },
  {
    icon: Zap,
    title: 'Multi-Channel Alerts',
    description: 'Critical threats trigger notifications via email, SMS, and automated phone calls so you never miss a high-priority event.',
  },
  {
    icon: BarChart3,
    title: 'Live Health Scoring',
    description: 'Dynamic security health score based on coverage, active threats, and system stability — always know your security posture.',
  },
  {
    icon: Activity,
    title: 'Runtime Inspector',
    description: 'Full live view of file, process, and network activity with filterable timeline and detailed telemetry data.',
  },
];

const AGENTS = [
  { icon: FileSearch, name: 'File Monitor', desc: 'Watches file system changes, new downloads, and suspicious executables in real-time.', tags: ['File Integrity', 'Download Scanning'] },
  { icon: Cpu, name: 'Process Monitor', desc: 'Tracks process spawns, parent-child chains, and detects resource anomalies.', tags: ['Spawn Detection', 'Chain Analysis'] },
  { icon: Wifi, name: 'Network Monitor', desc: 'Monitors all connections, unusual ports, and potential data exfiltration attempts.', tags: ['Port Analysis', 'DNS Tracking'] },
  { icon: Mail, name: 'Email Inbox', desc: 'Connects via IMAP and monitors for phishing attempts and suspicious patterns.', tags: ['Phishing Detection', 'Sender Analysis'] },
  { icon: Bell, name: 'Alert Dispatch', desc: 'Routes critical alerts through email, SMS, and automated phone calls.', tags: ['Multi-Channel', 'Severity Routing'] },
];

const STATS = [
  { value: '5', label: 'Intelligent Agents' },
  { value: '<2s', label: 'Detection Speed' },
  { value: '100%', label: 'Local Processing' },
  { value: '24/7', label: 'Always-On Protection' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      {/* ── Hero with shader background ────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-32 lg:pt-44 lg:pb-44">
        <ShaderBackground className="opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/30 via-transparent to-[#0a0a0f]" style={{ zIndex: 1 }} />

        <div className="relative mx-auto max-w-4xl px-6 text-center" style={{ zIndex: 2 }}>
          <div className="section-badge mb-8">
            <Shield className="h-4 w-4" />
            AI-Powered Cybersecurity
          </div>

          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
            Intelligent Protection{' '}
            <br className="hidden sm:block" />
            for <span className="text-gradient">Your Digital Life.</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-gray-400 md:text-xl">
            HavenAI learns your behavior and shields you from threats in real-time.
            Five coordinated AI agents working together, entirely on your device.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/download" className="btn-primary gap-2 text-base">
              Get Started
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/features" className="btn-secondary text-base">
              View Features
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trusted by / stats bar ───────────────────────── */}
      <section className="relative border-y border-white/[0.04] bg-white/[0.01] py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-8 text-center sm:grid-cols-2 md:grid-cols-4">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-bold text-white md:text-4xl">{value}</p>
                <p className="mt-1 text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Smoke background for lower sections ──────────── */}
      <div className="relative">
        <SmokeBackground className="opacity-50" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-transparent to-[#0a0a0f]" style={{ zIndex: 1 }} />

      {/* ── Agents showcase (alternating layout) ─────────── */}
      <section className="relative py-28" style={{ zIndex: 2 }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-20 text-center">
            <div className="section-badge mb-6 justify-center">Our Agents</div>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Five AI Agents That Guard{' '}
              <br className="hidden sm:block" />
              Every Surface
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-gray-500">
              A coordinated multi-agent system that monitors your files, processes, 
              network, email, and alert channels — working together in real-time.
            </p>
          </div>

          <div className="space-y-6">
            {AGENTS.map(({ icon: Icon, name, desc, tags }, idx) => (
              <div
                key={name}
                className={`grid items-center gap-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 md:grid-cols-[1fr_1.4fr] ${
                  idx % 2 === 1 ? 'md:grid-cols-[1.4fr_1fr]' : ''
                }`}
              >
                <div className={idx % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/[0.08] text-violet-400">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-white">{name}</h3>
                  <p className="mb-5 leading-relaxed text-gray-400">{desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-xs font-medium text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`flex items-center justify-center ${idx % 2 === 1 ? 'md:order-1' : ''}`}>
                  <div className="relative flex h-48 w-full items-center justify-center rounded-2xl border border-white/[0.04] bg-white/[0.01]">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/[0.04] to-cyan-500/[0.02]" />
                    <Icon className="relative h-16 w-16 text-white/[0.08]" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#0a0a0f]/80 px-3 py-2 backdrop-blur-sm">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                      <span className="text-xs text-gray-400">Agent active — monitoring in real-time</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits grid ────────────────────────────────── */}
      <section className="relative py-28" style={{ zIndex: 2 }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-20 text-center">
            <div className="section-badge mb-6 justify-center">Key Benefits</div>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Why Teams and Individuals{' '}
              <br className="hidden sm:block" />
              Choose HavenAI
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-gray-500">
              Enterprise-grade cybersecurity made personal — running entirely
              on your device with zero cloud dependency.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <div className="mb-4 inline-flex rounded-xl bg-white/[0.05] p-3 text-violet-400 transition-colors group-hover:text-violet-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="relative py-28" style={{ zIndex: 2 }}>
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.03] to-transparent" />
        </div>
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Ready to protect yourself?
          </h2>
          <p className="mt-5 text-lg text-gray-400">
            Download the desktop app and start intelligent protection in under a minute.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/download" className="btn-primary gap-2 text-base">
              Download Now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-secondary text-base">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      </div>{/* end smoke wrapper */}

      <Footer />
    </div>
  );
}
