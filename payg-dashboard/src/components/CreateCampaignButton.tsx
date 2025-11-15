'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = { productId: string | number; goal?: string };

export default function CreateCampaignButton({ productId, goal = 'sales' }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, goal }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const id = data?.id ?? data?.campaign?.id ?? data?.campaignId;
      if (!id) throw new Error('No campaign id returned from API');
      router.push(`/campaigns/${id}`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={onClick} disabled={loading} style={{ padding: '6px 10px' }}>
      {loading ? 'Creating…' : 'New Campaign'}
    </button>
  );
}
