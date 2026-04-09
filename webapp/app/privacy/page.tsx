import type { Metadata } from 'next';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy · HavenAI',
  description:
    'HavenAI is local-first. This page explains exactly what data stays on your device, what syncs to the cloud, and why.',
};

// If you update this file, bump the date so users can see when it changed.
const LAST_UPDATED = 'April 9, 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-gray-200">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-gray-400">
          <section>
            <p>
              HavenAI is a personal cybersecurity product designed around a single principle:
              <strong className="text-white"> your data should stay on your device.</strong>{' '}
              This page describes exactly what we do and do not collect, how long we keep it,
              and your rights. If anything is unclear, reach out at{' '}
              <a href="mailto:hello@havenai.com" className="text-cyan-400 hover:underline">
                hello@havenai.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">1. What runs on your device</h2>
            <p className="mt-3">
              When you install the HavenAI desktop app, a local agent runs on your computer and
              monitors activity across four areas: files, running processes, network connections,
              and (optionally) your email inbox. All scanning, scoring, and threat detection happens
              on your machine. The following <strong className="text-white">never leave your device</strong>:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>File paths, file contents, and file change history.</li>
              <li>The list of processes running on your computer or their command lines.</li>
              <li>The hostnames, IP addresses, or URLs your computer connects to.</li>
              <li>The contents of any email, including subject lines and message bodies.</li>
              <li>Your IMAP credentials (stored encrypted in your operating system&rsquo;s keychain).</li>
              <li>Browsing history, keystrokes, clipboard, or screen contents (we don&rsquo;t read these at all).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">2. What syncs to the cloud</h2>
            <p className="mt-3">
              A small amount of data is synced to our backend so you can see it on the web dashboard
              and receive notifications:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-white">Your account</strong> — email address, hashed password,
                display name.
              </li>
              <li>
                <strong className="text-white">Registered devices</strong> — a device name,
                operating system, and the timestamp of the most recent heartbeat. This is how we
                show whether monitoring is live on the dashboard.
              </li>
              <li>
                <strong className="text-white">Alert summaries</strong> — when the local agent flags
                something suspicious, a short scrubbed summary (severity, category, description,
                recommendation) is sent to the cloud so it appears on the dashboard. Full details
                like exact file paths are stripped on-device before syncing.
              </li>
              <li>
                <strong className="text-white">Your preferences</strong> — which monitors are on,
                notification channels, safelist entries.
              </li>
              <li>
                <strong className="text-white">Anonymous crash reports</strong> — if the agent
                crashes, we receive the error type, stack trace, and agent version. No file paths,
                process names, or user content is included.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">3. What we never collect</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>Behavioral analytics, usage tracking, or session recordings.</li>
              <li>Advertising identifiers or marketing cookies.</li>
              <li>Telemetry on which buttons you click or pages you view.</li>
              <li>Third-party trackers, pixels, or beacons.</li>
              <li>Location data or device identifiers beyond the device ID you register.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">4. How we use alerts</h2>
            <p className="mt-3">
              Alerts synced to our backend are used only to:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>Show them to you on your dashboard.</li>
              <li>Send you notifications through the channels you&rsquo;ve enabled (email, SMS, voice).</li>
              <li>Answer your questions when you ask the built-in chat assistant about an alert.</li>
            </ul>
            <p className="mt-3">
              Alerts are never sold, shared with advertisers, or used to train third-party models.
              When you ask the chat assistant a question, the alert context for that specific
              question is sent to an AI provider (currently OpenAI) to generate the response —
              this is the only case where alert data leaves our backend, and only for the
              question you actively asked.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">5. Retention</h2>
            <p className="mt-3">
              Alerts are kept on our backend for up to 90 days. You can delete individual alerts
              from the dashboard at any time. If you delete your account, all account data,
              devices, alerts, and preferences are permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">6. Security</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>All network communication between the desktop app and our backend uses TLS.</li>
              <li>Passwords are hashed with bcrypt; we never store them in plaintext.</li>
              <li>Email and account credentials on your device are encrypted using your
                  operating system&rsquo;s secure storage (macOS Keychain, Windows DPAPI).</li>
              <li>Authentication uses short-lived access tokens and refresh tokens.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">7. Your rights</h2>
            <p className="mt-3">
              You can view, export, or delete any data we hold about you at any time:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-white">View</strong> — the dashboard shows everything that
                exists on our backend about your account.
              </li>
              <li>
                <strong className="text-white">Delete individual alerts</strong> — use the dashboard alerts page.
              </li>
              <li>
                <strong className="text-white">Unlink a device</strong> — use Settings in the dashboard
                or desktop app. This wipes the device record and all alerts tied to it.
              </li>
              <li>
                <strong className="text-white">Delete your account</strong> — email us at{' '}
                <a href="mailto:hello@havenai.com" className="text-cyan-400 hover:underline">
                  hello@havenai.com
                </a>{' '}
                and we&rsquo;ll permanently remove everything within 30 days.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">8. Children</h2>
            <p className="mt-3">
              HavenAI is not directed at children under 13. We do not knowingly collect data from
              anyone under 13. If you believe we have, contact us and we&rsquo;ll delete it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">9. Changes to this policy</h2>
            <p className="mt-3">
              If we make material changes to this policy, we&rsquo;ll update the date at the top and
              notify you through the dashboard before they take effect. Continued use of HavenAI
              after a change means you accept the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">10. Contact</h2>
            <p className="mt-3">
              Questions or requests about privacy:{' '}
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
