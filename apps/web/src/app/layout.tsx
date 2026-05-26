import { Inter, JetBrains_Mono } from 'next/font/google';
import { type Metadata } from 'next';

import { AppShell } from '../components/AppShell.js';
import { Providers } from './providers.js';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'PulseGrid — Market Intelligence Terminal',
  description:
    'Real-time market intelligence and trading terminal: live order books, trade tape, top movers and deterministic scenario replay.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="h-full font-sans">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
