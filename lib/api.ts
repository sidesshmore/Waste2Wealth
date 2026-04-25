import { supabase } from './supabase';

const BASE = process.env.EXPO_PUBLIC_API_URL!;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method: string, path: string, body?: unknown) {
  const authHeaders = await getAuthHeaders();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders };
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return { data: await res.json() };
}

export const api = {
  get:   (path: string)              => request('GET',   path),
  post:  (path: string, body: unknown) => request('POST',  path, body),
  patch: (path: string, body: unknown) => request('PATCH', path, body),
};
