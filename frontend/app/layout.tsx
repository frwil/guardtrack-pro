import './globals.css';
import type { Metadata } from 'next';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { ServiceWorkerRegistration } from '../src/components/ServiceWorkerRegistration';
import { I18nProvider } from '../src/contexts/I18nContext';
import { AppSettingsProvider } from '../src/contexts/AppSettingsContext';
import 'leaflet/dist/leaflet.css';

// Empêcher l'insertion automatique du CSS
config.autoAddCss = false;

export const metadata: Metadata = {
  title: 'GuardTrack Pro',
  description: 'Application de suivi de présence pour agents de sécurité',
  manifest: '/manifest.json',
  themeColor: '#4f46e5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="antialiased">
        <I18nProvider>
          <AppSettingsProvider>
            <ServiceWorkerRegistration />
            {children}
          </AppSettingsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}