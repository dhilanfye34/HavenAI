import { type SVGProps } from 'react';

/**
 * Shield icon with a lock/keyhole inside.
 * Drop-in replacement for lucide's Shield — accepts the same className prop.
 */
export default function ShieldLock(props: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Shield outline (matches lucide Shield) */}
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      {/* Lock body */}
      <rect x="9.5" y="11" width="5" height="4" rx="0.5" />
      {/* Lock shackle */}
      <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" />
    </svg>
  );
}
