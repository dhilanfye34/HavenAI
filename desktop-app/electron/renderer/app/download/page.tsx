'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DownloadPage() {
  const router = useRouter();

  useEffect(() => {
    // Desktop app should stay in login/dashboard flow only.
    router.replace('/');
  }, [router]);

  return null;
}
