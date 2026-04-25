import { supabase } from './supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('/auth');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error('No auth URL');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new Error('Auth cancelled');

  const params = new URL(result.url);
  const accessToken  = params.searchParams.get('access_token');
  const refreshToken = params.searchParams.get('refresh_token');
  if (!accessToken) throw new Error('No access token in callback');

  await supabase.auth.setSession({
    access_token:  accessToken,
    refresh_token: refreshToken ?? '',
  });
  return supabase.auth.getSession();
}

export async function signOut() {
  await supabase.auth.signOut();
}
