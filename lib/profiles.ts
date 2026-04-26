import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const STORAGE_KEY = 'w2w_dev_profiles';

export interface DevProfile {
  id: string;
  label: string;
  access_token: string;
  refresh_token: string;
}

export async function loadProfiles(): Promise<DevProfile[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function persistProfiles(profiles: DevProfile[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

// Save (or update) the current session into the profiles list.
export async function saveCurrentSession() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return;

  const profiles = await loadProfiles();
  const idx = profiles.findIndex(p => p.id === session.user.id);
  if (idx === -1) {
    profiles.push({
      id: session.user.id,
      label: `User ${profiles.length + 1}`,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  } else {
    profiles[idx].access_token = session.access_token;
    profiles[idx].refresh_token = session.refresh_token;
  }
  await persistProfiles(profiles);
}

// Create a new anonymous profile, save it, and return it.
// Caller is responsible for running /users/sync afterward.
export async function addNewProfile(): Promise<DevProfile> {
  await saveCurrentSession();
  await supabase.auth.signOut();

  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;

  const { data } = await supabase.auth.getSession();
  const session = data.session!;

  const profiles = await loadProfiles();
  const newProfile: DevProfile = {
    id: session.user.id,
    label: `User ${profiles.length + 1}`,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  };
  profiles.push(newProfile);
  await persistProfiles(profiles);
  return newProfile;
}

// Switch to an existing profile. Caller runs /users/sync afterward.
export async function switchToProfile(profile: DevProfile): Promise<void> {
  await saveCurrentSession();

  const { error } = await supabase.auth.setSession({
    access_token: profile.access_token,
    refresh_token: profile.refresh_token,
  });
  if (error) throw error;

  // Persist refreshed tokens
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (session) {
    const profiles = await loadProfiles();
    const idx = profiles.findIndex(p => p.id === profile.id);
    if (idx !== -1) {
      profiles[idx].access_token = session.access_token;
      profiles[idx].refresh_token = session.refresh_token;
      await persistProfiles(profiles);
    }
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
