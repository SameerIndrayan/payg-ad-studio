// src/app/campaigns/[id]/page.tsx
import { api } from '@/lib/api';

type SummaryResp = {
  campaign: { id: string; goal: string; status: string; budgetCents: number };
  product: { id: string; title: string; priceCents: number; productUrl: string };
  totals: { costCents: number; revenueCents: number; profitCents: number; roi: number };
  counts: { receipts: number; sales: number; posts: number };
};

type PolicyResp = {
  campaign: { id: string; budgetCents: number };
  policy: {
    perCampaignCapCents: number;
    perMemoCaps: { tool_call?: number; asset_purchase?: number; post?: number };
  };
  spend: { totalCents: number; byMemo: { tool_call?: number; asset_purchase?: number; post?: number } };
};

const money = (cents?: number) =>
  typeof cents === 'number' ? `$${(cents / 100).toFixed(2)}` : '-';

async function getSummary(id: string): Promise<SummaryResp | null> {
  try { return await api.get<SummaryResp>(`/campaigns/${id}/summary`); } catch { return null; }
}
async function getPolicy(id: string): Promise<PolicyResp | null> {
  try { return await api.get<PolicyResp>(`/campaigns/${id}/policy`); } catch { return null; }
}

// Next 16: params can be a Promise—await it.
export default async function CampaignPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const [summary, policy] = await Promise.all([getSummary(id), getPolicy(id)]);

  const caps: Array<{ key: string; cap?: number; spend?: number }> = policy
    ? [
        { key: 'total',          cap: policy.policy.perCampaignCapCents,        spend: policy.spend.totalCents },
        { key: 'tool_call',      cap: policy.policy.perMemoCaps.tool_call,      spend: policy.spend.byMemo.tool_call ?? 0 },
        { key: 'asset_purchase', cap: policy.policy.perMemoCaps.asset_purchase, spend: policy.spend.byMemo.asset_purchase ?? 0 },
        { key: 'post',           cap: policy.policy.perMemoCaps.post,           spend: policy.spend.byMemo.post ?? 0 },
      ]
    : [];

  return (
    <section>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Campaign</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Cost</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{money(summary?.totals.costCents)}</div>
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Revenue</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{money(summary?.totals.revenueCents)}</div>
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Profit</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{money(summary?.totals.profitCents)}</div>
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#666' }}>ROI</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {typeof summary?.totals.roi === 'number' ? `${(summary.totals.roi * 100).toFixed(0)}%` : '-'}
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>Policy</h2>
      {!policy ? (
        <p>Couldn’t load policy.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Tool</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #eee', padding: 8 }}>Cap</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #eee', padding: 8 }}>Spend</th>
            </tr>
          </thead>
          <tbody>
            {caps.map(({ key, cap, spend }) => (
              <tr key={key}>
                <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{key}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', textAlign: 'right' }}>{money(cap)}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', textAlign: 'right' }}>{money(spend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
