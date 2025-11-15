// src/app/api/products/import/route.ts
import { NextResponse } from 'next/server';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function POST() {
  try {
    const res = await fetch(`${BASE}/products/import`, { method: 'POST' });
    const ct = res.headers.get('content-type') || '';
    const payload = ct.includes('application/json') ? await res.json() : await res.text();
    // Mirror backend status so the client sees 201 on success
    return NextResponse.json(payload as any, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
