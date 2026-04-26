import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('/auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Sign in cancelled');
  }
  if (result.type !== 'success') {
    throw new Error('Sign in failed');
  }

  const url = new URL(result.url);

  // PKCE flow: exchange code for session
  const code = url.searchParams.get('code');
  if (code) {
    const { error: ex } = await supabase.auth.exchangeCodeForSession(code);
    if (ex) throw ex;
    return;
  }

  // Implicit flow fallback: tokens in hash
  const hash = new URLSearchParams(url.hash.replace('#', ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken) {
    const { error: se } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken ?? '',
    });
    if (se) throw se;
    return;
  }

  throw new Error('No token in OAuth callback URL');
}

export async function signOut() {
  await supabase.auth.signOut();
}
