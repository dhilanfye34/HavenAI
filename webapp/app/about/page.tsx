import Link from 'next/link';
import {
  Users,
  Sparkles,
  Lock,
  Lightbulb,
  ArrowRight,
  FileSearch,
  Cpu,
  Wifi,
  Mail,
  Bell,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { WaveShader } from '../components/WaveShader';

const PRINCIPLES = [
  { title: 'Privacy by Default', desc: 'Your data never leaves your device unless you explicitly choose otherwise.' },
  { title: 'Local-First', desc: 'All threat analysis runs on your machine — no cloud dependency.' },
  { title: 'Zero Trust', desc: 'Every file, process, and connection is verified — nothing is assumed safe.' },
  { title: 'Adaptive Intelligence', desc: 'Agents learn your behavior over time to reduce noise and sharpen detection.' },
];

const TECH_STACK = [
  {
    label: 'Desktop Runtime',
    tech: 'Electron + Python',
    accent: 'from-violet-500 to-purple-600',
    bar: 'bg-gradient-to-r from-violet-500 to-purple-600',
    details: [
      'Chromium-based native desktop shell',
      'Python subprocess for system-level monitoring',
      'Local SQLite database for agent state',
      'Cross-platform support (macOS first)',
    ],
  },
  {
    label: 'AI Agents',
    tech: 'Python + OpenAI',
    accent: 'from-cyan-500 to-blue-600',
    bar: 'bg-gradient-to-r from-cyan-500 to-blue-600',
    details: [
      '5 specialized agents (file, process, network, email, alerts)',
      'Coordinator agent fuses signals with GPT-4o',
      'Behavioral baselining that adapts over time',
      'Real-time event stream processing',
    ],
  },
  {
    label: 'Web Dashboard',
    tech: 'Next.js + React',
    accent: 'from-emerald-500 to-teal-600',
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    details: [
      'Server-rendered React with Next.js App Router',
      'Tailwind CSS design system',
      'Real-time updates from the desktop agent',
      'Responsive command center UI',
    ],
  },
  {
    label: 'Backend',
    tech: 'FastAPI + PostgreSQL',
    accent: 'from-amber-500 to-orange-600',
    bar: 'bg-gradient-to-r from-amber-500 to-orange-600',
    details: [
      'Async Python API with Pydantic validation',
      'PostgreSQL for accounts and device registry',
      'JWT auth with refresh token rotation',
      'Twilio integration for SMS and voice alerts',
    ],
  },
];

/* Small pentagon agent diagram for the "Approach" section */
const AGENT_NODES = [
  { icon: FileSearch, color: 'text-violet-400', bg: 'bg-violet-500/20', label: 'Files', x: 50, y: 5 },
  { icon: Cpu, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Processes', x: 93, y: 38 },
  { icon: Bell, color: 'text-rose-400', bg: 'bg-rose-500/20', label: 'Alerts', x: 77, y: 85 },
  { icon: Mail, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Email', x: 23, y: 85 },
  { icon: Wifi, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Network', x: 7, y: 38 },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-white">
      {/* Wave shader only covers the hero area */}
      <div className="absolute top-0 left-0 h-screen w-full" style={{ zIndex: 0 }}>
        <WaveShader />
      </div>
      {/* Fade the shader into the solid black background */}
      <div className="pointer-events-none absolute top-[60vh] left-0 h-[40vh] w-full bg-gradient-to-b from-transparent to-[#0a0a0f]" style={{ zIndex: 0 }} />

      <div className="relative" style={{ zIndex: 1 }}>
      <Navbar />

      {/* ── Hero (unchanged) ─────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="section-badge mb-6 justify-center">About Us</div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            The Future of{' '}
            <span className="text-gradient">Personal Security</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
            Building AI-powered personal cybersecurity that adapts to you.
          </p>
        </div>
      </section>

      {/* ── Mission — text left, orb right ───────────────── */}
      <section className="relative py-24 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex rounded-xl bg-violet-500/[0.08] p-3 text-violet-400">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Our Mission</h2>
              <p className="mt-6 text-lg leading-relaxed text-gray-400">
                Most people lack access to enterprise-grade threat detection. HavenAI
                brings real-time, AI-driven cybersecurity to individuals — running
                entirely on your own device with zero cloud dependency for analysis.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-gray-400">
                We believe everyone deserves the same caliber of protection used by
                large enterprises — packaged in a simple desktop app with a clean
                command center.
              </p>
            </div>
            <div className="relative flex items-center justify-center">
              {/* Decorative glowing orb */}
              <div className="relative h-72 w-72 md:h-80 md:w-80">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600/20 via-cyan-500/10 to-transparent blur-3xl" />
                <div className="absolute inset-8 rounded-full bg-gradient-to-tr from-violet-500/15 to-blue-500/10 blur-2xl animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="h-16 w-16 text-violet-400/70" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Approach — diagram left, text right ──────── */}
      <section className="relative py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Agent pentagon diagram */}
            <div className="relative mx-auto h-72 w-72 md:h-80 md:w-80 lg:order-1 order-2">
              {/* Connection lines */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                {AGENT_NODES.map((node, i) => {
                  const next = AGENT_NODES[(i + 1) % AGENT_NODES.length];
                  return (
                    <line
                      key={`line-${i}`}
                      x1={node.x} y1={node.y}
                      x2={next.x} y2={next.y}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="0.5"
                    />
                  );
                })}
                {/* Lines to center */}
                {AGENT_NODES.map((node, i) => (
                  <line
                    key={`center-${i}`}
                    x1={node.x} y1={node.y}
                    x2={50} y2={50}
                    stroke="rgba(139,92,246,0.1)"
                    strokeWidth="0.3"
                  />
                ))}
              </svg>
              {/* Center coordinator node */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                  <Lightbulb className="h-5 w-5 text-violet-400" />
                </div>
                <p className="mt-1 text-center text-[10px] text-gray-500">Coordinator</p>
              </div>
              {/* Agent nodes */}
              {AGENT_NODES.map(({ icon: Icon, color, bg, label, x, y }) => (
                <div
                  key={label}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <p className="mt-1 text-center text-[10px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Text */}
            <div className="lg:order-2 order-1">
              <div className="mb-4 inline-flex rounded-xl bg-cyan-500/[0.08] p-3 text-cyan-400">
                <Lightbulb className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">The Approach</h2>
              <p className="mt-6 text-lg leading-relaxed text-gray-400">
                Five coordinated AI agents monitor your file system, processes, network
                connections, email, and alert channels. A central coordinator fuses their
                signals and provides actionable intelligence through a command center.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-gray-400">
                Each agent specializes in its domain, but they share context — a suspicious
                file download that spawns an unusual process and opens a network connection
                is flagged as a correlated threat, not three separate events.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── University + Built for Everyone (merged, centered) */}
      <section className="relative py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 md:p-14">
            <div className="mb-8 flex justify-center">
              <div className="inline-flex rounded-2xl bg-emerald-500/[0.08] p-4 text-emerald-400">
                <Sparkles className="h-8 w-8" />
              </div>
            </div>
            <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
              Why We <span className="text-gradient">Started</span>
            </h2>
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              <div className="relative">
                <h3 className="mb-3 text-lg font-semibold text-white">The Project</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                  HavenAI combines machine learning, systems programming, and modern
                  web engineering to solve a real-world problem: making cybersecurity
                  accessible and personal.
                </p>
              </div>
              <div className="relative md:border-l md:border-white/[0.06] md:pl-10">
                <h3 className="mb-3 text-lg font-semibold text-white">Built for Everyone</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                  Whether you are a student, freelancer, or remote worker, HavenAI provides
                  the same caliber of protection used by large enterprises — packaged in a
                  simple desktop app with a clean command center.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Design Principles ────────────────────────────── */}
      <section className="relative border-y border-white/[0.04] bg-white/[0.01] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map(({ title, desc }) => (
              <div key={title} className="text-center">
                <p className="text-lg font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack (expanded) ────────────────────────── */}
      <section className="relative py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <div className="section-badge mb-6 justify-center">Technology</div>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Our Tech Stack
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-gray-500">
              A modern, full-stack architecture designed for real-time threat detection and a seamless user experience.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TECH_STACK.map((item) => (
              <div
                key={item.label}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                {/* Colored accent bar */}
                <div className={`h-[2px] w-full ${item.bar}`} />
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{item.label}</p>
                  <p className="mt-2 text-lg font-bold text-white">{item.tech}</p>
                  <ul className="mt-4 space-y-2">
                    {item.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2 text-sm leading-relaxed text-gray-400">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-600" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Get Protected Today</h2>
          <p className="mt-5 text-lg text-gray-400">
            Download the desktop app and experience enterprise-grade security.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/download" className="btn-primary gap-2">
              Download
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/features" className="btn-secondary">
              View Features
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  );
}
