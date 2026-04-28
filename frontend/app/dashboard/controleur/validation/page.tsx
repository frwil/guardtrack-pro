'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../../../src/contexts/I18nContext';

export default function ValidationRedirectPage() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    router.replace('/dashboard/controleur');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">{t('controller.validation.redirecting')}</p>
    </div>
  );
}