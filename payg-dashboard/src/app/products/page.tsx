// src/app/products/page.tsx
import { api } from '@/lib/api';
import ImportButton from '@/components/ImportButton';
import CreateCampaignButton from '@/components/CreateCampaignButton';

type Product = {
  id: string | number;
  title: string;
  imageUrl?: string | null;
  priceCents?: number | null;
};

async function getProducts(): Promise<Product[]> {
  try {
    const data = await api.get<Product[]>('/products');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Failed to fetch /products:', err);
    return [];
  }
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <section>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Products</h1>

      <div style={{ marginBottom: 12 }}>
        <ImportButton />
      </div>

      {products.length === 0 ? (
        <p>No products yet.</p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {products.map((p) => (
            <li key={p.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 6 }}
                />
              ) : (
                <div style={{ width: '100%', height: 160, background: '#fafafa', borderRadius: 6 }} />
              )}

              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.title}</div>
                  {typeof p.priceCents === 'number' && (
                    <div style={{ color: '#666', fontSize: 13 }}>
                      ${(p.priceCents / 100).toFixed(2)}
                    </div>
                  )}
                </div>

                {/* ✅ The button belongs here, inside the map */}
                <CreateCampaignButton productId={p.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
