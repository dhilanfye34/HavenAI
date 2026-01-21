import Link from 'next/link';
import { Shield, Eye, Brain, Lock } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-cyan-400" />
            <span className="text-2xl font-bold">HavenAI</span>
          </div>
          <div className="space-x-4">
            <Link 
              href="/login" 
              className="px-4 py-2 text-gray-300 hover:text-white transition"
            >
              Login
            </Link>
            <Link 
              href="/login" 
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Your Personal AI
          <span className="text-cyan-400"> Security Guard</span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          HavenAI learns your normal behavior and protects you from threats in real-time. 
          No complex setup. No cloud data sharing. Just intelligent protection.
        </p>
        <div className="flex justify-center space-x-4">
          <Link 
            href="/login"
            className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-lg font-semibold transition"
          >
            Start Free
          </Link>
          <Link 
            href="#features"
            className="px-8 py-3 border border-gray-600 hover:border-gray-500 rounded-lg text-lg transition"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why HavenAI?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Brain className="h-10 w-10 text-cyan-400" />}
            title="Learns Your Behavior"
            description="HavenAI builds a personalized baseline of your normal activity and flags anything unusual."
          />
          <FeatureCard 
            icon={<Eye className="h-10 w-10 text-cyan-400" />}
            title="Real-Time Monitoring"
            description="Watches your downloads, network connections, and running processes 24/7."
          />
          <FeatureCard 
            icon={<Lock className="h-10 w-10 text-cyan-400" />}
            title="Privacy First"
            description="All analysis happens locally on your device. Your data never leaves your computer."
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-gray-800 rounded-2xl p-10">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-cyan-400">90%</div>
              <div className="text-gray-400 mt-2">of breaches involve human error</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-400">&lt;2s</div>
              <div className="text-gray-400 mt-2">threat detection time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-400">100%</div>
              <div className="text-gray-400 mt-2">local processing</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to protect yourself?</h2>
        <p className="text-gray-300 mb-8">
          Join thousands of users who trust HavenAI with their digital security.
        </p>
        <Link 
          href="/login"
          className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-lg font-semibold transition inline-block"
        >
          Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-cyan-400" />
            <span className="font-semibold">HavenAI</span>
          </div>
          <div className="text-gray-400 text-sm">
            © 2024 HavenAI. University of Miami Senior Design Project.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
