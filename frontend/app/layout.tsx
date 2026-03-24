import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { AnalysisProvider } from '@/lib/AnalysisContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'InboxPilot — Kiinteistöyhtiön viestien analyysi',
  description:
    'Multi-agent tekoälysovellus, joka analysoi kiinteistöyhtiön sähköpostiviestit ja kirjoittaa vastausluonnoksen.',
  icons: {
    icon: '/inboxpilot/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fi">
<body>
        <header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 1.5rem',
          }}
        >
          <nav
            style={{
              maxWidth: '900px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '56px',
            }}
          >
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 700,
                fontSize: '1.125rem',
                color: '#6366f1',
              }}
            >
              <Image
                src="/inboxpilot/icon.webp"
                alt=""
                width={24}
                height={24}
                style={{ borderRadius: '4px' }}
              />
              InboxPilot
            </Link>
            <Link href="/how-it-works" className="navPill">
              Toimintamalli
            </Link>
          </nav>
        </header>
        <main>
          <AnalysisProvider>{children}</AnalysisProvider>
        </main>
      </body>
    </html>
  );
}
