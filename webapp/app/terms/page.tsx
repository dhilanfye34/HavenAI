import type { Metadata } from 'next';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service · HavenAI',
  description:
    'The terms that apply when you use HavenAI. Plain-English version, not legalese.',
};

const LAST_UPDATED = 'April 9, 2026';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-gray-200">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-gray-400">
          <section>
            <p>
              These are the terms you agree to when you use HavenAI. We&rsquo;ve tried to keep them
              short and readable. If anything is unclear, email{' '}
              <a href="mailto:hello@havenai.com" className="text-cyan-400 hover:underline">
                hello@havenai.com
              </a>{' '}
              before using the product.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">1. What HavenAI is</h2>
            <p className="mt-3">
              HavenAI is a personal cybersecurity product. It installs a desktop app on your
              computer that monitors files, running processes, network connections, and
              (optionally) your email inbox to detect threats. A companion web dashboard lets
              you review alerts, manage settings, and chat with an AI assistant about specific
              findings. All threat detection runs locally on your device.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">2. Your account</h2>
            <p className="mt-3">
              You need an account to use HavenAI. You&rsquo;re responsible for keeping your password
              safe and for anything that happens under your account. If you think someone else
              has access, change your password and email us. You must be at least 13 years old
              to create an account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">3. What you can and can&rsquo;t do</h2>
            <p className="mt-3">You can:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Install HavenAI on devices you own or are authorized to protect.</li>
              <li>Connect email accounts you own or have permission to scan.</li>
              <li>Use the dashboard and chat assistant for personal security purposes.</li>
            </ul>
            <p className="mt-4">You can&rsquo;t:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Use HavenAI to monitor a device or email account without the owner&rsquo;s consent.</li>
              <li>Reverse engineer, decompile, or tamper with the agent binary or backend.</li>
              <li>Use the service to attack, probe, or disrupt any system that isn&rsquo;t yours.</li>
              <li>Resell, sublicense, or redistribute HavenAI without our written permission.</li>
              <li>Feed the chat assistant content you don&rsquo;t have the right to share.</li>
            </ul>
            <p className="mt-4">
              Violating these rules can result in immediate account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">4. The chat assistant</h2>
            <p className="mt-3">
              The built-in chat assistant uses third-party AI models to explain alerts and answer
              security questions. Its responses are suggestions, not professional advice. Don&rsquo;t
              rely on it as your only source of security guidance, and double-check anything
              high-stakes. We&rsquo;re not responsible for actions you take based on chat output.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">5. Threat detection isn&rsquo;t perfect</h2>
            <p className="mt-3">
              HavenAI uses heuristics, pattern matching, and machine-learning models to flag
              threats. These are imperfect by nature. <strong className="text-white">We cannot guarantee
              that HavenAI will detect every threat, nor that every alert represents a real
              threat.</strong> You should treat it as an extra layer of protection, not a replacement
              for safe computing habits, backups, or other security tools.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">6. Service availability</h2>
            <p className="mt-3">
              We do our best to keep the web dashboard and backend running, but HavenAI is
              provided &ldquo;as is&rdquo; without uptime guarantees. The desktop agent will keep
              monitoring your device even if our backend is temporarily unavailable — local
              detection does not require our servers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">7. Pricing and cancellation</h2>
            <p className="mt-3">
              HavenAI is currently free to use during beta. We&rsquo;ll give you at least 30 days&rsquo;
              notice via email before introducing any paid plan, and existing data will never be
              held hostage behind a paywall. You can delete your account and uninstall the
              desktop app at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">8. Updates</h2>
            <p className="mt-3">
              The desktop app automatically downloads and installs updates to fix bugs, patch
              security issues, and add features. By using HavenAI, you agree to receive these
              updates. You can decline an update by quitting the app, but staying on an old
              version may leave you exposed to known issues.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">9. Liability</h2>
            <p className="mt-3">
              To the fullest extent allowed by law, HavenAI and its creators are not liable for
              any indirect, incidental, or consequential damages — including data loss, missed
              threats, or downtime — arising from your use of the service. Our total liability
              for any claim is limited to the amount you&rsquo;ve paid us in the past 12 months (which,
              during free beta, is zero).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">10. Termination</h2>
            <p className="mt-3">
              You can stop using HavenAI at any time by uninstalling the desktop app and deleting
              your account. We can suspend or terminate your account if you violate these terms
              or use the service in a way that harms others. We&rsquo;ll give you notice whenever we
              can.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">11. Changes</h2>
            <p className="mt-3">
              If we change these terms, we&rsquo;ll update the date at the top and notify you through
              the dashboard before they take effect. Continued use after a change means you
              accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">12. Contact</h2>
            <p className="mt-3">
              Questions about these terms:{' '}
              <a href="mailto:hello@havenai.com" className="text-cyan-400 hover:underline">
                hello@havenai.com
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
