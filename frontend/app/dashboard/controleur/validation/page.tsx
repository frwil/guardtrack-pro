'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ValidationRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/controleur');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">Redirection vers la validation...</p>
    </div>
  );
}