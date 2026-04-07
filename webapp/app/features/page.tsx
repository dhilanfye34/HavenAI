'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileSearch,
  Cpu,
  Wifi,
  Mail,
  Bell,
  ArrowRight,
  AlertTriangle,
  Bug,
  KeyRound,
  Database,
  Globe,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import ShieldLock from '../components/ShieldLock';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { DottedSurface } from '../components/DottedSurface';

/* ── Agent data ─────────────────────────────────────────── */

const AGENTS = [
  {
    slug: 'file-monitor',
    icon: FileSearch,
    name: 'File Monitor Agent',
    color: 'text-violet-400',
    bg: 'bg-violet-500/[0.08]',
    bar: 'bg-gradient-to-r from-violet-500 to-purple-600',
    glowColor: 'rgba(139, 92, 246, 0.12)',
    description:
      'Continuously watches your file system for new downloads, suspicious executables, integrity changes, and anomalous file activity. Alerts are generated in real-time as events occur.',
    longDescription:
      'The File Monitor creates cryptographic hashes of critical system files and watches for unauthorized changes. It monitors download folders, temp directories, and desktop for newly arriving files — flagging double extensions, unsigned executables, and known malicious signatures before they can execute.',
    steps: [
      'Watches download folders, desktop, and system directories for new files',
      'Computes file hashes and checks integrity against known baselines',
      'Flags suspicious extensions (.pdf.exe), unsigned binaries, and anomalies',
      'Sends structured alert to the coordinator agent for triage',
    ],
    feedLines: [
      { time: '12:04:03', text: 'New file: ~/Downloads/report_final.docx', flagged: false },
      { time: '12:04:17', text: 'New file: ~/Downloads/invoice.pdf.exe', flagged: true },
      { time: '12:04:17', text: '↳ Double extension detected — FLAGGED', flagged: true },
      { time: '12:04:22', text: 'Integrity check: /usr/bin/ssh — OK', flagged: false },
      { time: '12:04:31', text: 'New file: ~/Desktop/setup_crack.dmg', flagged: true },
    ],
  },
  {
    slug: 'process-monitor',
    icon: Cpu,
    name: 'Process Monitor Agent',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/[0.08]',
    bar: 'bg-gradient-to-r from-cyan-500 to-blue-600',
    glowColor: 'rgba(34, 211, 238, 0.12)',
    description:
      'Tracks new process spawns, suspicious parent-child process chains, and identifies resource-heavy applications. Detects processes that may indicate malware or unauthorized activity.',
    longDescription:
      'Beyond simple process listing, this agent builds a real-time process tree and analyzes parent-child relationships. A Word document spawning PowerShell, or a browser launching a system utility — these anomalous chains are flagged instantly. It also monitors CPU and memory spikes that may indicate cryptominers or runaway malware.',
    steps: [
      'Monitors all new process spawns and builds a live process tree',
      'Analyzes parent-child chains for anomalous relationships',
      'Tracks CPU/memory usage to detect cryptominers and resource abuse',
      'Correlates suspicious processes with file and network activity',
    ],
    feedLines: [
      { time: '12:04:05', text: 'Spawn: node (pid 4821) → parent: Terminal', flagged: false },
      { time: '12:04:11', text: 'Spawn: powershell (pid 4833) → parent: Word.exe', flagged: true },
      { time: '12:04:11', text: '↳ Anomalous parent chain — FLAGGED', flagged: true },
      { time: '12:04:18', text: 'CPU spike: cryptod (pid 4901) — 94% usage', flagged: true },
      { time: '12:04:25', text: 'Spawn: Finder (pid 4910) → parent: launchd', flagged: false },
    ],
  },
  {
    slug: 'network-monitor',
    icon: Wifi,
    name: 'Network Monitor Agent',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/[0.08]',
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    glowColor: 'rgba(52, 211, 153, 0.12)',
    description:
      'Monitors all inbound and outbound network connections. Detects unusual ports, potential data exfiltration, connections to suspicious hosts, and unexpected network activity.',
    longDescription:
      'Every TCP and UDP connection on your machine is tracked in real-time. The agent resolves DNS queries, geolocks destination IPs, and monitors for large outbound data transfers that could signal exfiltration. Connections to known malicious hosts or unusual ports (like outbound traffic on port 4444) trigger immediate alerts.',
    steps: [
      'Captures all TCP/UDP connections with source, destination, and port info',
      'Resolves DNS and geolocks destination IPs against threat databases',
      'Monitors data volume per connection to detect exfiltration attempts',
      'Flags unusual ports, unknown destinations, and suspicious patterns',
    ],
    feedLines: [
      { time: '12:04:02', text: 'OUT 192.168.1.5:443 → github.com (US)', flagged: false },
      { time: '12:04:09', text: 'OUT 192.168.1.5:4444 → 45.33.12.8 (RU)', flagged: true },
      { time: '12:04:09', text: '↳ Unusual port + suspicious geo — FLAGGED', flagged: true },
      { time: '12:04:15', text: 'DNS: api.havenai.app → 52.24.1.100', flagged: false },
      { time: '12:04:22', text: 'OUT large transfer: 850MB → 103.8.41.2', flagged: true },
    ],
  },
  {
    slug: 'email-inbox',
    icon: Mail,
    name: 'Email Inbox Agent',
    color: 'text-amber-400',
    bg: 'bg-amber-500/[0.08]',
    bar: 'bg-gradient-to-r from-amber-500 to-orange-600',
    glowColor: 'rgba(245, 158, 11, 0.12)',
    description:
      'Connects to your email via IMAP and monitors for phishing attempts, suspicious attachments, and unusual sending patterns that may indicate account compromise.',
    longDescription:
      'The Email agent connects securely to your inbox and scans incoming messages for phishing indicators — spoofed sender domains, urgency language, suspicious links, and weaponized attachments. It builds a sender reputation model over time, so emails from new or unusual senders get extra scrutiny while trusted contacts pass through cleanly.',
    steps: [
      'Connects to your inbox via IMAP with local-only credential storage',
      'Scans headers, body text, and links for phishing indicators',
      'Analyzes attachments for known malicious signatures and macros',
      'Builds sender reputation model to reduce false positives over time',
    ],
    feedLines: [
      { time: '12:04:01', text: 'Scan: "Team standup notes" from alex@company.com', flagged: false },
      { time: '12:04:08', text: 'Scan: "Urgent: Verify account" from support@paypa1.com', flagged: true },
      { time: '12:04:08', text: '↳ Spoofed domain + urgency language — PHISHING', flagged: true },
      { time: '12:04:14', text: 'Scan: "Invoice #4821" from billing@vendor.io', flagged: false },
      { time: '12:04:20', text: 'Attachment: macro-enabled .xlsm — FLAGGED', flagged: true },
    ],
  },
  {
    slug: 'alert-dispatch',
    icon: Bell,
    name: 'Alert Dispatch Agent',
    color: 'text-rose-400',
    bg: 'bg-rose-500/[0.08]',
    bar: 'bg-gradient-to-r from-rose-500 to-pink-600',
    glowColor: 'rgba(244, 63, 94, 0.12)',
    description:
      'Routes critical security alerts through multiple channels — email, SMS text messages, and automated phone calls — ensuring you never miss a high-priority threat notification.',
    longDescription:
      'Not all threats are equal. The Alert Dispatch agent triages incoming signals by severity and routes them through the appropriate channel. Low-severity events appear in your dashboard. Medium threats trigger email and SMS. Critical threats escalate to automated phone calls — so even if your laptop is closed, you know something needs attention.',
    steps: [
      'Receives triaged alerts from the coordinator with severity ratings',
      'Low severity: logs to dashboard with contextual details',
      'Medium severity: sends email notification + SMS text message',
      'Critical severity: triggers automated phone call via Twilio',
    ],
    feedLines: [
      { time: '12:04:03', text: '● LOW: New unsigned app detected → Dashboard', flagged: false },
      { time: '12:04:11', text: '● MED: Phishing email detected → Email + SMS', flagged: false },
      { time: '12:04:17', text: '● CRIT: Active exfiltration attempt', flagged: true },
      { time: '12:04:17', text: '  ↳ Email sent ✓  SMS sent ✓  Voice call ✓', flagged: true },
      { time: '12:04:25', text: '● LOW: Process CPU spike resolved → Dashboard', flagged: false },
    ],
  },
];

/* Threats positioned radially — angle in degrees, ring (0=inner, 1=mid, 2=outer) */
const THREATS = [
  { icon: AlertTriangle, name: 'Ransomware', angle: 0, severity: 'critical', agents: ['File Monitor', 'Process Monitor'], desc: 'Mass file encryption, extension renaming, and ransom note drops.' },
  { icon: Bug, name: 'Malware', angle: 45, severity: 'critical', agents: ['File Monitor', 'Process Monitor'], desc: 'Unsigned executables, double extensions, and known malicious signatures.' },
  { icon: Globe, name: 'C2 Connections', angle: 90, severity: 'critical', agents: ['Network Monitor', 'Process Monitor'], desc: 'Traffic to command-and-control servers, unusual ports, and beaconing.' },
  { icon: Mail, name: 'Phishing', angle: 135, severity: 'critical', agents: ['Email Inbox', 'Alert Dispatch'], desc: 'Spoofed domains, urgency language, suspicious links, and weaponized attachments.' },
  { icon: ShieldAlert, name: 'Privilege Escalation', angle: 180, severity: 'critical', agents: ['Process Monitor', 'File Monitor'], desc: 'Anomalous parent-child chains attempting elevated system access.' },
  { icon: Upload, name: 'Data Exfiltration', angle: 225, severity: 'high', agents: ['Network Monitor', 'Alert Dispatch'], desc: 'Large outbound transfers and connections to suspicious destinations.' },
  { icon: Database, name: 'Cryptominers', angle: 270, severity: 'high', agents: ['Process Monitor', 'Network Monitor'], desc: 'Hidden processes consuming abnormal CPU and memory resources.' },
  { icon: KeyRound, name: 'Credential Theft', angle: 315, severity: 'high', agents: ['Process Monitor', 'File Monitor'], desc: 'Keylogger behavior, clipboard access, and password file reads.' },
];

/* ── Page ────────────────────────────────────────────────── */

export default function FeaturesPage() {
  return (
    <div className="relative min-h-screen text-white">
      <div className="fixed inset-0 bg-[#0a0a0f]" style={{ zIndex: -1 }} />
      <DottedSurface className="opacity-40" />
      <div className="relative" style={{ zIndex: 1 }}>
        <Navbar />

        {/* ── Hero ───────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-32 pb-20">
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

        {/* ── Agent deep-dives ───────────────────────────── */}
        <section className="py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-16 text-center">
              <div className="section-badge mb-6 justify-center">Core Agents</div>
              <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
                Five Specialized Agents
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-gray-500">
                Each agent is an expert in its domain — but they share context and work
                together to detect correlated threats across your entire system.
              </p>
            </div>

            <div className="space-y-0">
              {AGENTS.map((agent, i) => (
                <AgentSection key={agent.slug} agent={agent} flip={i % 2 === 1} isLast={i === AGENTS.length - 1} />
              ))}
            </div>
          </div>
        </section>

        {/* ── What We Detect — Radial Threat Map ─────── */}
        <section className="relative pt-12 pb-8 overflow-hidden">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-8 text-center">
              <div className="section-badge mb-6 justify-center">Threat Coverage</div>
              <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
                What We <span className="text-gradient">Detect</span>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-gray-500">
                Real threats, caught in real-time. Our agents are trained to identify
                and neutralize threats across every surface of your device.
              </p>
              <div className="mt-6 flex items-center justify-center gap-6">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-[11px] text-gray-500">Critical</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-[11px] text-gray-500">High</span>
                </div>
              </div>
            </div>

            <div className="-mt-4">
              <ThreatRadialMap />
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────── */}
        <section className="py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Start Protecting Yourself
            </h2>
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

/* ── Agent deep-dive section ─────────────────────────────── */

function AgentSection({
  agent,
  flip,
  isLast,
}: {
  agent: (typeof AGENTS)[number];
  flip: boolean;
  isLast: boolean;
}) {
  const { slug, icon: Icon, name, color, bg, bar, glowColor, description, longDescription, steps, feedLines } = agent;

  return (
    <div
      id={slug}
      className={`scroll-mt-24 py-16 ${!isLast ? 'border-b border-white/[0.04]' : ''}`}
    >
      <div className={`grid items-start gap-12 lg:grid-cols-2 ${flip ? '' : ''}`}>
        {/* Text side */}
        <div className={flip ? 'lg:order-2' : 'lg:order-1'}>
          <div className={`mb-4 inline-flex rounded-xl ${bg} p-3 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight md:text-3xl">{name}</h3>
          <p className="mt-4 text-base leading-relaxed text-gray-400">{description}</p>
          <p className="mt-3 text-base leading-relaxed text-gray-400">{longDescription}</p>

          {/* How it works steps */}
          <div className="mt-8 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">How it works</p>
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${bg} ${color}`}>
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-gray-400">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Visual side — live feed mockup */}
        <div className={`relative ${flip ? 'lg:order-1' : 'lg:order-2'}`}>
          {/* Background glow */}
          <div
            className="pointer-events-none absolute -inset-8 rounded-3xl blur-3xl opacity-30"
            style={{ background: glowColor }}
          />
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0d14]">
            {/* Colored top bar */}
            <div className={`h-[2px] w-full ${bar}`} />
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <div className="relative flex h-2 w-2 items-center justify-center">
                <div className="absolute h-2 w-2 rounded-full bg-emerald-400/40 animate-ping" />
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </div>
              <span className="font-mono text-[11px] text-gray-500">Live Feed — {name.replace(' Agent', '')}</span>
            </div>
            {/* Feed lines */}
            <div className="space-y-0 p-3">
              {feedLines.map((line, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded px-2 py-1.5 font-mono text-[11px] leading-relaxed transition-colors ${
                    i === feedLines.length - 1 ? 'bg-white/[0.02]' : ''
                  }`}
                >
                  <span className="shrink-0 text-gray-600">{line.time}</span>
                  <span className={line.flagged ? 'text-red-400/90' : 'text-gray-400'}>
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Radial threat map ───────────────────────────────────── */

function ThreatRadialMap() {
  const [active, setActive] = useState<number | null>(null);

  const RADIUS = 38;
  const C = 50;

  const pos = (angle: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: C + RADIUS * Math.cos(rad), y: C + RADIUS * Math.sin(rad) };
  };

  /* Tooltip goes outward from the circle */
  const getTooltipSide = (angle: number): 'left' | 'right' | 'top' | 'bottom' => {
    const norm = ((angle % 360) + 360) % 360;
    if (norm === 0 || norm === 360) return 'top';
    if (norm === 180) return 'bottom';
    return (norm > 0 && norm < 180) ? 'right' : 'left';
  };

  const activeThreat = active !== null ? THREATS[active] : null;

  return (
    <>
    <div className="relative mx-auto w-full max-w-[820px] aspect-square">
      {/* SVG rings + lines */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
        <circle cx={C} cy={C} r="46" fill="none" stroke="rgba(239,68,68,0.05)" strokeWidth="0.25" />
        <circle cx={C} cy={C} r="38" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.15" strokeDasharray="0.8 1.2" />
        <circle cx={C} cy={C} r="28" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.15" />
        <circle cx={C} cy={C} r="16" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.15" />
        <circle cx={C} cy={C} r="12" fill="url(#radialCenterGlow)" />

        {THREATS.map(({ name, angle }, i) => {
          const p = pos(angle);
          return (
            <line
              key={name}
              x1={C} y1={C} x2={p.x} y2={p.y}
              stroke={active === i ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.04)'}
              strokeWidth={active === i ? '0.45' : '0.25'}
              className="transition-all duration-300"
            />
          );
        })}

        <defs>
          <radialGradient id="radialCenterGlow">
            <stop offset="0%" stopColor="rgba(139,92,246,0.2)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </radialGradient>
        </defs>
      </svg>

      {/* Center shield */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 shadow-[0_0_60px_rgba(139,92,246,0.25)]">
          <ShieldLock className="h-9 w-9 text-violet-400" />
        </div>
        <p className="mt-2 text-xs font-semibold tracking-widest text-violet-400/60 uppercase">Protected</p>
      </div>

      {/* Threat nodes with inline tooltips */}
      {THREATS.map(({ icon: Icon, name, angle, severity, desc, agents }, i) => {
        const p = pos(angle);
        const isCritical = severity === 'critical';
        const isActive = active === i;
        const side = getTooltipSide(angle);
        const tooltipClasses = side === 'top'
          ? 'right-full mr-1 bottom-0'
          : side === 'bottom'
            ? 'left-full ml-1 top-0'
            : side === 'right'
              ? 'left-full ml-4 top-1/2 -translate-y-1/2'
              : 'right-full mr-4 top-1/2 -translate-y-1/2';

        return (
          <div
            key={name}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => {
              // Only clear on desktop; mobile uses tap-to-select
              if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
                setActive(null);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              setActive(i);
            }}
          >
            {/* Node + pulse wrapper */}
            <div className="relative" style={{ width: 56, height: 56 }}>
              {/* Pulse — centered on the node */}
              <div
                className={`absolute inset-0 rounded-full ${isCritical ? 'bg-red-500/15' : 'bg-amber-500/15'} animate-ping`}
                style={{ animationDuration: '3s' }}
              />
              {/* Node circle */}
              <div
                className={`relative flex h-full w-full items-center justify-center rounded-full border transition-all duration-300 ${
                  isCritical ? 'border-red-500/25 bg-red-500/10' : 'border-amber-500/25 bg-amber-500/10'
                } ${
                  isActive
                    ? `scale-110 ${isCritical ? 'shadow-[0_0_30px_rgba(239,68,68,0.35)]' : 'shadow-[0_0_30px_rgba(245,158,11,0.35)]'}`
                    : `${isCritical ? 'shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'shadow-[0_0_15px_rgba(245,158,11,0.1)]'}`
                }`}
              >
                <Icon className={`h-6 w-6 ${isCritical ? 'text-red-400' : 'text-amber-400'}`} />
              </div>
            </div>
            {/* Label */}
            <p className={`mt-2 text-xs font-medium whitespace-nowrap transition-colors duration-200 ${isActive ? 'text-white' : 'text-gray-500'}`}>
              {name}
            </p>

            {/* Tooltip — desktop only (hidden on mobile to avoid viewport overflow) */}
            {isActive && (
              <div className={`absolute ${tooltipClasses} z-30 w-56 rounded-xl border border-white/[0.08] bg-[#111118]/95 backdrop-blur-sm px-4 py-3 pointer-events-none hidden lg:block`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <h4 className="text-sm font-semibold text-white">{name}</h4>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    isCritical ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {severity}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-400">{desc}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {agents.map((a) => (
                    <span key={a} className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[9px] font-medium text-gray-500">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

    </div>

    {/* Detail panel — shown on mobile/tablet always; on desktop shows only when a node is active */}
    <div className="mx-auto mt-6 w-full max-w-[640px] px-2 lg:hidden">
      {activeThreat ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#111118]/95 px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <activeThreat.icon className={`h-5 w-5 ${activeThreat.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
            <h4 className="text-base font-semibold text-white">{activeThreat.name}</h4>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              activeThreat.severity === 'critical' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
            }`}>
              {activeThreat.severity}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-gray-400">{activeThreat.desc}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activeThreat.agents.map((a) => (
              <span key={a} className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-gray-500">
                {a}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-xs text-gray-600">Tap a threat to see details</p>
      )}
    </div>
    </>
  );
}
