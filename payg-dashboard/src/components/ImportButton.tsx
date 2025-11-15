// src/components/ImportButton.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportButton() {
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products/import', { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Import failed (${res.status})`);
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
      startTransition(() => router.refresh()); // re-fetch the server component data
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || isPending}
      style={{ padding: '8px 12px' }}
    >
      {loading || isPending ? 'Importing…' : 'Import from Shopify'}
    </button>
  );
}
