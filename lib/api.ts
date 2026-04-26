import { supabase } from './supabase';

const BASE = process.env.EXPO_PUBLIC_API_URL!;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method: string, path: string, body?: unknown) {
  const url = `${BASE}${path}`;
  console.log(`[api] ${method} ${url}`);
  const authHeaders = await getAuthHeaders();
  const hasToken = !!authHeaders.Authorization;
  if (authHeaders.Authorization) {
    try {
      const seg = authHeaders.Authorization.split(' ')[1]?.split('.')[0] ?? '';
      const hdr = JSON.parse(atob(seg.replace(/-/g,'+').replace(/_/g,'/')));
      console.log('[api] JWT header:', JSON.stringify(hdr));
    } catch {}
  }
  console.log(`[api] hasToken=${hasToken} BASE="${BASE}"`);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders };
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (fetchErr: any) {
    console.log(`[api] fetch threw (network error) for ${url}:`, fetchErr?.message, fetchErr?.toString());
    throw fetchErr;
  }
  console.log(`[api] ${method} ${url} → ${res.status}`);
  if (!res.ok) {
    const text = await res.text();
    console.log(`[api] error body:`, text);
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return { data: await res.json() };
}

export const api = {
  get:   (path: string)              => request('GET',   path),
  post:  (path: string, body: unknown) => request('POST',  path, body),
  patch: (path: string, body: unknown) => request('PATCH', path, body),
};
