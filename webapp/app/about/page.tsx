import Link from 'next/link';
import { Users, GraduationCap, Target, Lightbulb, ArrowRight } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { WaveShader } from '../components/WaveShader';

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

      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="section-badge mb-6 justify-center">About Us</div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            The Future of{' '}
            <span className="text-gradient">Personal Security</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
            A senior design project at the University of Miami — building AI-powered
            personal cybersecurity that adapts to you.
          </p>
        </div>
      </section>

      {/* Everything below sits on solid #0a0a0f */}
      <section className="relative py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 transition-all duration-300 hover:border-white/[0.12]">
              <div className="mb-4 inline-flex rounded-xl bg-violet-500/[0.08] p-3 text-violet-400">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Our Mission</h3>
              <p className="text-sm leading-relaxed text-gray-400">
                Most people lack access to enterprise-grade threat detection. HavenAI
                brings real-time, AI-driven cybersecurity to individuals — running
                entirely on your own device with zero cloud dependency for analysis.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 transition-all duration-300 hover:border-white/[0.12]">
              <div className="mb-4 inline-flex rounded-xl bg-cyan-500/[0.08] p-3 text-cyan-400">
                <Lightbulb className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">The Approach</h3>
              <p className="text-sm leading-relaxed text-gray-400">
                Five coordinated AI agents monitor your file system, processes, network
                connections, email, and alert channels. A central coordinator fuses their
                signals and provides actionable intelligence through a command center.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 transition-all duration-300 hover:border-white/[0.12]">
              <div className="mb-4 inline-flex rounded-xl bg-emerald-500/[0.08] p-3 text-emerald-400">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">University of Miami</h3>
              <p className="text-sm leading-relaxed text-gray-400">
                Built as a senior design project, HavenAI combines machine learning,
                systems programming, and modern web engineering to solve a real-world
                problem: making cybersecurity accessible and personal.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 transition-all duration-300 hover:border-white/[0.12]">
              <div className="mb-4 inline-flex rounded-xl bg-amber-500/[0.08] p-3 text-amber-400">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Built for Everyone</h3>
              <p className="text-sm leading-relaxed text-gray-400">
                Whether you are a student, freelancer, or remote worker, HavenAI provides
                the same caliber of protection used by large enterprises — packaged in a
                simple desktop app with a clean command center.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <div className="section-badge mb-6 justify-center">Technology</div>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Our Tech Stack
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Desktop Runtime', tech: 'Electron + Python', desc: 'Native desktop agent with system-level access' },
              { label: 'AI Agents', tech: 'Python + OpenAI', desc: 'Multi-agent coordination and threat analysis' },
              { label: 'Web Dashboard', tech: 'Next.js + React', desc: 'Real-time command center and alert management' },
              { label: 'Backend', tech: 'FastAPI + PostgreSQL', desc: 'Authentication, device sync, and alert routing' },
            ].map((item) => (
              <div key={item.label} className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05]">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{item.tech}</p>
                <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
