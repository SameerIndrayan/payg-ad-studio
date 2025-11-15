export const metadata = { title: 'PAYG Ad Studio', description: 'Dashboard' };

import Link from 'next/link';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ borderBottom: '1px solid #eee', padding: '12px 16px' }}>
          <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link href="/" style={{ fontWeight: 700 }}>PAYG Ad Studio</Link>
            <Link href="/products">Products</Link>
            <Link href="/campaigns">Campaigns</Link>
            <Link href="/ledger">Ledger</Link>
            <Link href="/summary">Summary</Link>
            <Link href="/policy">Policy</Link>
            {/* Placeholder for later: Payments (Locus / Coinbase) */}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#666' }}>
              API: {process.env.NEXT_PUBLIC_API_BASE_URL}
            </span>
          </nav>
        </header>
        <main style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>{children}</main>
      </body>
    </html>
  );
}
