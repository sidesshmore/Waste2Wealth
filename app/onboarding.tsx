import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keypair } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { signInWithGoogle } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { Colors } from '../constants/colors';
import { S } from '../constants/spacing';

async function syncAndNavigate() {
  const { data: sync } = await api.post('/users/sync', {}) as any;
  if (sync.is_new) {
    const kp = Keypair.generate();
    await SecureStore.setItemAsync(
      'solana_secret_key',
      Buffer.from(kp.secretKey).toString('base64'),
    );
    await api.post('/users/wallet', { wallet_address: kp.publicKey.toString() });
  }
  router.replace('/(tabs)');
}

export default function OnboardingScreen() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      await syncAndNavigate();
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnonSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      await syncAndNavigate();
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>Waste2Wealth</Text>
        <Text style={styles.tagline}>Clean cities. Earn crypto.</Text>
      </View>

      <View style={styles.cta}>
        <Text style={styles.pitch}>Report garbage. Clean up. Earn SOL.</Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Continue with Google</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.anonButton, loading && styles.buttonDisabled]}
          onPress={handleAnonSignIn}
          disabled={loading}
        >
          <Text style={styles.anonButtonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: S.xl },
  hero:           { flex: 1, justifyContent: 'center', alignItems: 'center', gap: S.sm },
  wordmark:       { fontSize: 32, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.greenDark },
  tagline:        { fontSize: 16, fontFamily: 'InterVariable', color: Colors.textSecondary },
  cta:            { paddingBottom: 48, gap: S.base },
  pitch:          { textAlign: 'center', fontSize: 14, color: Colors.textSecondary, fontFamily: 'InterVariable' },
  button:         { backgroundColor: Colors.greenDark, borderRadius: 8, height: 56, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 16, fontFamily: 'InterVariable', fontWeight: '510' as any },
  anonButton:     { height: 48, justifyContent: 'center', alignItems: 'center' },
  anonButtonText: { color: Colors.textSecondary, fontSize: 15, fontFamily: 'InterVariable' },
});
