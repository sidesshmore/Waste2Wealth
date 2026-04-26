import {
  View, Text, StyleSheet, TouchableOpacity, Modal, FlatList,
  ActivityIndicator, Alert,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Keypair } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../constants/colors';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import {
  DevProfile, addNewProfile, getCurrentUserId,
  loadProfiles, saveCurrentSession, switchToProfile,
} from '../lib/profiles';

async function syncUser() {
  const { data: sync } = await api.post('/users/sync', {}) as any;
  if (sync.is_new) {
    const kp = Keypair.generate();
    await SecureStore.setItemAsync(
      'solana_secret_key',
      Buffer.from(kp.secretKey).toString('base64'),
    );
    await api.post('/users/wallet', { wallet_address: kp.publicKey.toString() });
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [profiles, setProfiles] = useState<DevProfile[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshProfiles = useCallback(async () => {
    await saveCurrentSession();
    const [all, cid] = await Promise.all([loadProfiles(), getCurrentUserId()]);
    setProfiles(all);
    setCurrentId(cid);
  }, []);

  useEffect(() => {
    if (modalVisible) refreshProfiles();
  }, [modalVisible, refreshProfiles]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  async function handleSwitch(profile: DevProfile) {
    if (profile.id === currentId) return;
    setBusy(true);
    try {
      await switchToProfile(profile);
      await syncUser();
      setModalVisible(false);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Switch failed', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddProfile() {
    setBusy(true);
    try {
      await addNewProfile();
      await syncUser();
      setModalVisible(false);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Failed to add profile', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.sub}>City stats + cleanups — Phase 5</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.switchBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.switchText}>Switch Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Dev Profile Switcher</Text>

            {profiles.length === 0 && (
              <Text style={styles.empty}>No saved profiles yet.</Text>
            )}

            <FlatList
              data={profiles}
              keyExtractor={p => p.id}
              renderItem={({ item }) => {
                const active = item.id === currentId;
                return (
                  <TouchableOpacity
                    style={[styles.profileRow, active && styles.profileRowActive]}
                    onPress={() => handleSwitch(item)}
                    disabled={busy}
                  >
                    <View style={[styles.avatar, active && styles.avatarActive]}>
                      <Text style={styles.avatarText}>
                        {item.label.charAt(item.label.length - 1)}
                      </Text>
                    </View>
                    <View style={styles.profileInfo}>
                      <Text style={[styles.profileLabel, active && styles.profileLabelActive]}>
                        {item.label}
                      </Text>
                      <Text style={styles.profileId} numberOfLines={1}>
                        {item.id.slice(0, 16)}…
                      </Text>
                    </View>
                    {active && <Text style={styles.activeBadge}>Active</Text>}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 300 }}
            />

            <TouchableOpacity
              style={[styles.addBtn, busy && styles.disabled]}
              onPress={handleAddProfile}
              disabled={busy}
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.addBtnText}>+ Add New Profile</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  title:            { fontSize: 24, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textPrimary },
  sub:              { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
  actions:          { marginTop: 32, gap: 12, alignItems: 'center' },
  switchBtn:        { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.greenDark },
  switchText:       { color: Colors.greenDark, fontSize: 16 },
  logoutBtn:        { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e53e3e' },
  logoutText:       { color: '#e53e3e', fontSize: 16 },

  // Modal
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:            { backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle:       { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 16, textAlign: 'center' },
  empty:            { color: Colors.textSecondary, textAlign: 'center', marginBottom: 12 },

  profileRow:       { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8, backgroundColor: Colors.surface },
  profileRowActive: { backgroundColor: Colors.greenTint, borderWidth: 1, borderColor: Colors.greenMid },
  avatar:           { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  avatarActive:     { backgroundColor: Colors.greenMid },
  avatarText:       { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  profileInfo:      { flex: 1, marginLeft: 12 },
  profileLabel:     { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  profileLabelActive: { color: Colors.greenDark },
  profileId:        { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  activeBadge:      { fontSize: 12, color: Colors.greenDark, fontWeight: '600', backgroundColor: Colors.greenTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  addBtn:           { backgroundColor: Colors.greenDark, borderRadius: 10, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  addBtnText:       { color: '#fff', fontSize: 15, fontWeight: '600' },
  disabled:         { opacity: 0.6 },
  cancelBtn:        { height: 44, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  cancelText:       { color: Colors.textSecondary, fontSize: 15 },
});
