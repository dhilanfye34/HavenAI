import Link from 'next/link';
import ShieldLock from './ShieldLock';

const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/download', label: 'Download' },
      { href: '/dashboard', label: 'Dashboard' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a0a0f]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <ShieldLock className="h-6 w-6 text-cyan-400" />
              <span className="text-lg font-bold tracking-tight text-white">HavenAI</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
              AI-powered personal cybersecurity. Protects you from threats in real-time, 
              learning your behavior to keep you safe.
            </p>
          </div>
          {FOOTER_LINKS.map((group) => (
            <div key={group.heading}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {group.heading}
              </p>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-white/[0.06] pt-6 text-center text-xs text-gray-600">
          &copy; {new Date().getFullYear()} HavenAI. University of Miami Senior Design Project.
        </div>
      </div>
    </footer>
  );
}
