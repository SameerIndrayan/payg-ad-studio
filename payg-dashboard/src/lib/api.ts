const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

type FetchOpts = Omit<RequestInit, 'body'> & { body?: unknown };

async function request<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = `${BASE}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };

  const res = await fetch(url, {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText} — ${url}\n${text}`);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export const api = {
  get:  <T = unknown>(path: string, opts?: FetchOpts) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, opts?: FetchOpts) =>
    request<T>(path, { ...opts, method: 'POST', body }),
};

export { BASE as API_BASE_URL };
