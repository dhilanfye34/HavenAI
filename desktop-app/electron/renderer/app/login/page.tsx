'use client';

import LoginForm from './LoginForm';

// Route-level default export. The state machine in ../page.tsx uses
// <LoginForm> directly with its own props; this file just satisfies
// Next.js's PageProps constraint for the /login route.
export default function LoginRoute() {
  return <LoginForm />;
}
