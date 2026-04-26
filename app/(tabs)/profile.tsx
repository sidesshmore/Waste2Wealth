import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { Colors } from '../../constants/colors';
import { S } from '../../constants/spacing';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useRouter } from 'expo-router';

interface UserProfile {
  id: string;
  email: string;
  reputation: number;
  sol_earned: number;
  wallet_address: string | null;
  world_id_nullifier: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me')
      .then(({ data }) => setUser(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.greenDark} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {user && (
        <View style={styles.card}>
          <Row label="Email" value={user.email ?? '—'} />
          <Row label="Reputation" value={String(user.reputation ?? 0)} />
          <Row label="SOL Earned" value={user.sol_earned != null ? `${user.sol_earned} SOL` : '0 SOL'} />
          <Row label="World ID" value={user.world_id_nullifier ? 'Verified ✓' : 'Not verified'} valueColor={user.world_id_nullifier ? Colors.greenDark : Colors.textSecondary} />
          <Row label="Wallet" value={user.wallet_address ? `${user.wallet_address.slice(0, 6)}…${user.wallet_address.slice(-4)}` : '—'} />
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center:    { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: S.xl, paddingTop: 64 },
  title:     { fontSize: 26, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textPrimary, marginBottom: S.xl },

  card: {
    backgroundColor: Colors.surface ?? '#f5f5f5',
    borderRadius: 12,
    paddingVertical: S.sm,
    marginBottom: S.xl,
  },
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: S.base, paddingVertical: S.md },
  label: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'InterVariable' },
  value: { fontSize: 14, color: Colors.textPrimary, fontFamily: 'InterVariable', fontWeight: '510' as any, maxWidth: '60%', textAlign: 'right' },

  logoutBtn:  { borderRadius: 8, borderWidth: 1, borderColor: '#e53e3e', paddingVertical: S.md, alignItems: 'center' },
  logoutText: { color: '#e53e3e', fontSize: 16, fontFamily: 'InterVariable' },
});
