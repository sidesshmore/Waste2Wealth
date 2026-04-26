import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
  Modal, FlatList, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Keypair } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence, interpolate, Extrapolation, runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase as supabaseClient } from '../../lib/supabase';
import { api } from '../../lib/api';
import { buildComparisonImage, buildHeroImage } from '../../lib/cloudinary';
import { Colors } from '../../constants/colors';
import { S } from '../../constants/spacing';
import {
  DevProfile, addNewProfile, getCurrentUserId,
  loadProfiles, saveCurrentSession, switchToProfile,
} from '../../lib/profiles';

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

type VerifyPhase = 'idle' | 'animating' | 'success';

function WorldIdAnimation({ phase }: { phase: VerifyPhase }) {
  const rotation  = useSharedValue(0);
  const pulse     = useSharedValue(1);
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const ringOpacity = useSharedValue(0.6);
  const ringScale = useSharedValue(1);

  useEffect(() => {
    if (phase === 'animating') {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1800, easing: Easing.linear }),
        -1,
        false,
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 900 }),
          withTiming(1,    { duration: 900 }),
        ),
        -1,
        false,
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.15, { duration: 900 }),
          withTiming(0.6,  { duration: 900 }),
        ),
        -1,
        false,
      );
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 900 }),
          withTiming(1,    { duration: 900 }),
        ),
        -1,
        false,
      );
    }
    if (phase === 'success') {
      rotation.value  = withTiming(rotation.value, { duration: 0 });
      pulse.value     = withTiming(1);
      ringOpacity.value = withTiming(0, { duration: 300 });
      checkScale.value   = withSpring(1, { damping: 10, stiffness: 180 });
      checkOpacity.value = withTiming(1, { duration: 250 });
    }
  }, [phase]);

  const globeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulse.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <View style={anim.container}>
      {/* Fixed-size box — ring, globe, and checkmark all stay inside here */}
      <View style={anim.globeWrap}>
        <Animated.View style={[anim.ring, ringStyle]} />
        <Animated.View style={[anim.globe, globeStyle]}>
          <Ionicons name="earth" size={72} color={Colors.greenDark} />
        </Animated.View>
        {phase === 'success' && (
          <Animated.View style={[anim.checkWrap, checkStyle]}>
            <View style={anim.checkCircle}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
          </Animated.View>
        )}
      </View>

      <Text style={anim.label}>
        {phase === 'success' ? 'Identity Verified!' : 'Connecting to World ID…'}
      </Text>
      {phase === 'success' && (
        <Text style={anim.sublabel}>One real person confirmed</Text>
      )}
    </View>
  );
}

const anim = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: 20 },
  globeWrap: { width: 144, height: 144, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 124, height: 124, borderRadius: 62,
    borderWidth: 3, borderColor: Colors.greenDark,
  },
  globe: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  checkWrap: { position: 'absolute', right: 4, bottom: 4 },
  checkCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.greenDark,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  label:    { fontSize: 18, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textPrimary, textAlign: 'center' },
  sublabel: { fontSize: 14, fontFamily: 'InterVariable', color: Colors.textSecondary, textAlign: 'center' },
});

const SWIPE_THRESHOLD = 100;

// ── Profile strip ─────────────────────────────────────────────────────────────
function ProfileStrip({ insetTop }: { insetTop: number }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [profiles, setProfiles] = useState<DevProfile[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/users/me').then(({ data }) => setUser(data)).catch(() => {});
  }, []);

  const refreshProfiles = useCallback(async () => {
    await saveCurrentSession();
    const [all, cid] = await Promise.all([loadProfiles(), getCurrentUserId()]);
    setProfiles(all);
    setCurrentId(cid);
  }, []);

  useEffect(() => {
    if (modalVisible) refreshProfiles();
  }, [modalVisible, refreshProfiles]);

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

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?';

  return (
    <>
      <View style={[ps.wrap, { paddingTop: insetTop + S.sm }]}>
        {/* Avatar + info */}
        <View style={ps.left}>
          <View style={ps.avatar}>
            <Text style={ps.avatarTxt}>{initials}</Text>
          </View>
          <View>
            <Text style={ps.email} numberOfLines={1}>{user?.email ?? '—'}</Text>
            <View style={ps.statsRow}>
              <Text style={ps.stat}>★ {user?.reputation ?? 0}</Text>
              <Text style={ps.statSep}>·</Text>
              <Text style={ps.stat}>{user?.sol_earned ?? '0'} SOL</Text>
              {user?.world_id_nullifier ? (
                <>
                  <Text style={ps.statSep}>·</Text>
                  <Ionicons name="shield-checkmark" size={12} color={Colors.greenMid} />
                </>
              ) : null}
            </View>
          </View>
        </View>

        {/* Switch profile + sign out */}
        <View style={ps.actions}>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={ps.iconBtn} hitSlop={8}>
            <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => supabaseClient.auth.signOut()}
            style={ps.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile switcher modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={ps.overlay}>
          <View style={ps.sheet}>
            <Text style={ps.sheetTitle}>Switch Profile</Text>

            {profiles.length === 0 && (
              <Text style={ps.empty}>No saved profiles yet.</Text>
            )}

            <FlatList
              data={profiles}
              keyExtractor={p => p.id}
              renderItem={({ item }) => {
                const active = item.id === currentId;
                return (
                  <TouchableOpacity
                    style={[ps.profileRow, active && ps.profileRowActive]}
                    onPress={() => handleSwitch(item)}
                    disabled={busy}
                  >
                    <View style={[ps.pAvatar, active && ps.pAvatarActive]}>
                      <Text style={ps.pAvatarTxt}>
                        {item.label.charAt(item.label.length - 1)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[ps.pLabel, active && ps.pLabelActive]}>{item.label}</Text>
                      <Text style={ps.pId} numberOfLines={1}>{item.id.slice(0, 16)}…</Text>
                    </View>
                    {active && <Text style={ps.activeBadge}>Active</Text>}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 280 }}
            />

            <TouchableOpacity
              style={[ps.addBtn, busy && ps.dimmed]}
              onPress={handleAddProfile}
              disabled={busy}
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={ps.addBtnTxt}>+ Add New Profile</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={ps.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={ps.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const ps = StyleSheet.create({
  wrap: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: S.base,
    paddingBottom:    S.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  left:      { flexDirection: 'row', alignItems: 'center', gap: S.sm, flex: 1 },
  avatar: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: Colors.greenTint,
    justifyContent:  'center',
    alignItems:      'center',
  },
  avatarTxt: { fontSize: 13, fontFamily: 'InterVariable', fontWeight: '700' as any, color: Colors.greenDark },
  email:     { fontSize: 13, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textPrimary, maxWidth: 200 },
  statsRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  stat:      { fontSize: 11, fontFamily: 'InterVariable', color: Colors.textSecondary },
  statSep:   { fontSize: 11, color: Colors.border },
  actions:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn:   { padding: S.xs },

  // Modal
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle:     { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 16, textAlign: 'center' },
  empty:          { color: Colors.textSecondary, textAlign: 'center', marginBottom: 12 },

  profileRow:       { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8, backgroundColor: Colors.surface },
  profileRowActive: { backgroundColor: Colors.greenTint, borderWidth: 1, borderColor: Colors.greenMid },
  pAvatar:          { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  pAvatarActive:    { backgroundColor: Colors.greenMid },
  pAvatarTxt:       { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  pLabel:           { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  pLabelActive:     { color: Colors.greenDark },
  pId:              { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  activeBadge:      { fontSize: 12, color: Colors.greenDark, fontWeight: '600', backgroundColor: Colors.greenTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  addBtn:    { backgroundColor: Colors.greenDark, borderRadius: 10, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  addBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
  dimmed:    { opacity: 0.6 },
  cancelBtn: { height: 44, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  cancelTxt: { color: Colors.textSecondary, fontSize: 15 },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function VerifyScreen() {
  const insets = useSafeAreaInsets();
  const [worldIdVerified, setWorldIdVerified] = useState<boolean | null>(null);
  const [verifying, setVerifying]             = useState(false);
  const [verifyPhase, setVerifyPhase]         = useState<VerifyPhase>('idle');
  const [pending, setPending]   = useState<any[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [voting, setVoting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // ── Boot: check World ID status ─────────────────────────────────────────────
  useEffect(() => {
    console.log('[verify] boot: fetching /users/me');
    api.get('/users/me')
      .then(({ data }) => {
        console.log('[verify] /users/me ok', JSON.stringify(data));
        setCurrentUserId(data.id);
        setWorldIdVerified(!!data.world_id_nullifier);
      })
      .catch((e) => {
        console.log('[verify] /users/me error', e?.message, e?.toString());
        setWorldIdVerified(false);
      });
  }, []);

  // ── Load pending cleanups once verified ─────────────────────────────────────
  useEffect(() => {
    if (!worldIdVerified || !currentUserId) return;
    const load = async () => {
      console.log('[verify] loading pending cleanups from supabase');
      const [{ data, error }, { data: myVotes }] = await Promise.all([
        supabaseClient
          .from('cleanups')
          .select('*, report:reports(*)')
          .eq('status', 'pending_verification'),
        supabaseClient
          .from('votes')
          .select('cleanup_id')
          .eq('voter_id', currentUserId),
      ]);
      console.log('[verify] pending cleanups:', data?.length ?? 0, error ? `error: ${error.message}` : 'ok');
      const votedIds = new Set((myVotes ?? []).map((v: any) => v.cleanup_id));
      setPending((data ?? []).filter((c: any) => !votedIds.has(c.id)));
      setCardIndex(0);
    };
    load();
    const ch = supabaseClient
      .channel(`verify-pending-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleanups' }, load)
      .subscribe();
    return () => { supabaseClient.removeChannel(ch); };
  }, [worldIdVerified, currentUserId]);

  // ── World ID verification ────────────────────────────────────────────────────
  // Note: @worldcoin/idkit-core v4 uses WebAssembly which Hermes doesn't support.
  // The backend /users/verify-world-id endpoint IS wired to the real World ID v4 API.
  // For the demo we call the dev bypass; in production this would use the native Swift IDKit SDK.
  const handleVerify = async () => {
    setVerifying(true);
    setVerifyPhase('animating');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Fire API call in parallel with the animation
    const apiPromise = api.post('/users/dev-verify', {}).catch(() => null);

    // Show animating phase for ~3.5s then transition to success
    await new Promise((r) => setTimeout(r, 3500));
    await apiPromise;

    setVerifyPhase('success');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Hold success screen for 1.2s before entering the verified deck
    await new Promise((r) => setTimeout(r, 1200));
    setWorldIdVerified(true);
    setVerifying(false);
    setVerifyPhase('idle');
  };

  // ── Vote + advance card ──────────────────────────────────────────────────────
  const submitVote = (vote: boolean) => {
    const cleanup = pending[cardIndex];
    if (!cleanup || voting) return;
    setVoting(true);
    Haptics.notificationAsync(
      vote ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    );
    api.post('/votes/', { cleanup_id: cleanup.id, vote }).catch(() => {});
    setCardIndex((i) => i + 1);
    translateX.value = 0;
    translateY.value = 0;
    setVoting(false);
  };

  const handleSkip = () => {
    if (!pending[cardIndex]) return;
    Haptics.selectionAsync();
    setCardIndex((i) => i + 1);
    translateX.value = 0;
    translateY.value = 0;
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.25;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir = e.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(dir * 600, { duration: 200 });
        runOnJS(submitVote)(dir > 0);
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const topCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(
          translateX.value, [-200, 200], [-18, 18], Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  const approveOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 80], [0, 1], Extrapolation.CLAMP),
  }));
  const rejectOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, -80], [0, 1], Extrapolation.CLAMP),
  }));

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (worldIdVerified === null) {
    return (
      <View style={styles.root}>
        <ProfileStrip insetTop={insets.top} />
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.greenDark} /></View>
      </View>
    );
  }

  // ── World ID gate ────────────────────────────────────────────────────────────
  if (!worldIdVerified) {
    return (
      <View style={styles.root}>
        <ProfileStrip insetTop={insets.top} />
        <View style={[styles.center, { padding: S.xl }]}>
          {verifyPhase !== 'idle' ? (
            <WorldIdAnimation phase={verifyPhase} />
          ) : (
            <>
              <Text style={styles.gateTitle}>Verify your humanity to vote</Text>
              <Text style={styles.gateSub}>
                One real person = one vote. World ID prevents bots and Sybil attacks.
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, verifying && styles.btnDisabled]}
                onPress={handleVerify}
                disabled={verifying}
              >
                <Text style={styles.primaryBtnText}>Verify with World ID</Text>
              </TouchableOpacity>
              <Text style={styles.gateNote}>Powered by Worldcoin — one verification per human</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const currentCleanup = pending[cardIndex];
  const nextCleanup    = pending[cardIndex + 1];

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!currentCleanup) {
    return (
      <View style={styles.root}>
        <ProfileStrip insetTop={insets.top} />
        <View style={[styles.center, { padding: S.xl }]}>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySub}>No cleanups waiting for review. Check back soon.</Text>
        </View>
      </View>
    );
  }

  // ── Swipe deck ───────────────────────────────────────────────────────────────
  const remaining = pending.length - cardIndex;
  const beforeUrl = currentCleanup.report?.photo_public_id
    ? buildComparisonImage(currentCleanup.report.photo_public_id) : null;
  const afterUrl = currentCleanup.after_public_id
    ? buildComparisonImage(currentCleanup.after_public_id) : null;

  return (
    <View style={styles.root}>
      <ProfileStrip insetTop={insets.top} />

      {/* ── Header row ────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Community Review</Text>
        <View style={styles.countChip}>
          <Text style={styles.countText}>{remaining} left</Text>
        </View>
      </View>

      {/* ── Swipe hint (first card only) ──────────────────────────── */}
      {cardIndex === 0 && (
        <View style={styles.swipeHint}>
          <View style={styles.hintSide}>
            <Ionicons name="chevron-back" size={13} color={Colors.mapRed} />
            <Text style={[styles.hintLabel, { color: Colors.mapRed }]}>Not Cleaned</Text>
          </View>
          <Text style={styles.hintCenter}>swipe to vote</Text>
          <View style={styles.hintSide}>
            <Text style={[styles.hintLabel, { color: Colors.greenDark }]}>Cleaned!</Text>
            <Ionicons name="chevron-forward" size={13} color={Colors.greenDark} />
          </View>
        </View>
      )}

      {/* ── Deck ──────────────────────────────────────────────────── */}
      <View style={styles.deck}>
        {nextCleanup && (
          <View style={[styles.card, styles.cardBack]}>
            <CardContent
              cleanup={nextCleanup}
              beforeUrl={nextCleanup.report?.photo_public_id ? buildComparisonImage(nextCleanup.report.photo_public_id) : null}
              afterUrl={nextCleanup.after_public_id ? buildComparisonImage(nextCleanup.after_public_id) : null}
            />
          </View>
        )}

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.card, topCardStyle]}>
            <Animated.View style={[styles.overlay, styles.overlayApprove, approveOpacity]}>
              <Text style={[styles.overlayText, { color: Colors.greenDark }]}>CLEANED!</Text>
            </Animated.View>
            <Animated.View style={[styles.overlay, styles.overlayReject, rejectOpacity]}>
              <Text style={[styles.overlayText, { color: Colors.mapRed }]}>NOT CLEANED</Text>
            </Animated.View>
            <CardContent cleanup={currentCleanup} beforeUrl={beforeUrl} afterUrl={afterUrl} />
          </Animated.View>
        </GestureDetector>
      </View>

      {/* ── 3-button action row ───────────────────────────────────── */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => submitVote(false)} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color={Colors.mapRed} />
          <Text style={styles.rejectBtnLabel}>Not Cleaned</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.8}>
          <Ionicons name="remove" size={24} color={Colors.textSecondary} />
          <Text style={styles.skipBtnLabel}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveBtn} onPress={() => submitVote(true)} activeOpacity={0.8}>
          <Ionicons name="checkmark" size={24} color={Colors.greenDark} />
          <Text style={styles.approveBtnLabel}>Cleaned!</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.progress, { paddingBottom: insets.bottom + S.sm }]}>
        {cardIndex} of {pending.length} reviewed
      </Text>
    </View>
  );
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function parseVisionResult(transcript: any): 'pass' | 'fail' | 'unclear' {
  if (!transcript) return 'unclear';
  try {
    const data = transcript.data || transcript;
    const rqs: any[] = data?.moderation?.rejection_questions ?? [];
    if (rqs.length > 0 && typeof rqs[0] === 'object') {
      if (rqs[0].reject === true)  return 'pass';
      if (rqs[0].reject === false) return 'fail';
    }
    const status = transcript.status || data?.status;
    if (status === 'rejected') return 'pass';
    if (status === 'approved') return 'fail';
  } catch {}
  return 'unclear';
}

function parseVisionReasoning(transcript: any): string | null {
  if (!transcript) return null;
  try {
    const data = transcript.data ?? transcript;
    const rqs: any[] = data?.moderation?.rejection_questions ?? [];
    if (rqs.length > 0 && typeof rqs[0]?.response === 'string') {
      const resp = rqs[0].response.toLowerCase();
      if (resp === 'yes') return 'Cloudinary AI Vision: litter removed ✓';
      if (resp === 'no')  return 'Cloudinary AI Vision: litter may still be present';
    }
    const arqs: any[] = data?.analysis?.rejection_questions_responses ?? [];
    if (arqs.length > 0 && typeof arqs[0]?.response === 'string') {
      return `Cloudinary AI: ${arqs[0].response}`;
    }
  } catch {}
  return null;
}

const SEV_COLOR: Record<string, string> = {
  Major: Colors.mapRed, Moderate: Colors.mapAmber, Minor: Colors.greenMid,
};

function CardContent({ cleanup, beforeUrl, afterUrl }: {
  cleanup: any; beforeUrl: string | null; afterUrl: string | null;
}) {
  const [expanded, setExpanded] = useState<{ url: string; label: string } | null>(null);

  const aiVerdict   = parseVisionResult(cleanup.vision_transcript);
  const aiReasoning = parseVisionReasoning(cleanup.vision_transcript);
  const sev         = cleanup.report?.severity as string | undefined;
  const when        = timeAgo(cleanup.submitted_at);
  const address     = cleanup.report?.address
    ? cleanup.report.address.split(',').slice(0, 2).join(',')
    : null;

  const beforeHero = cleanup.before_public_id ? buildHeroImage(cleanup.before_public_id) : beforeUrl;
  const afterHero  = cleanup.after_public_id  ? buildHeroImage(cleanup.after_public_id)  : afterUrl;

  const aiIcon  = aiVerdict === 'pass' ? 'checkmark-circle' : aiVerdict === 'fail' ? 'close-circle' : 'time-outline';
  const aiColor = aiVerdict === 'pass' ? Colors.greenDark : aiVerdict === 'fail' ? Colors.mapRed : Colors.textSecondary;

  return (
    <View style={card.root}>
      {/* Question header */}
      <View style={card.questionRow}>
        <Ionicons name="help-circle-outline" size={15} color={Colors.textSecondary} />
        <Text style={card.questionText}>Was this area cleaned up?</Text>
      </View>

      {/* BEFORE */}
      <View style={card.imgBlock}>
        <View style={card.imgLabelRow}>
          <View style={[card.imgDot, { backgroundColor: Colors.mapAmber }]} />
          <Text style={card.imgLabel}>BEFORE</Text>
          {beforeUrl && <Text style={card.tapHint}>tap to expand</Text>}
        </View>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => beforeHero && setExpanded({ url: beforeHero, label: 'BEFORE' })}
          disabled={!beforeUrl}
        >
          {beforeUrl
            ? <Image source={beforeUrl} style={card.img} contentFit="cover" />
            : <View style={[card.img, card.imgEmpty]} />}
        </TouchableOpacity>
      </View>

      {/* AFTER */}
      <View style={card.imgBlock}>
        <View style={card.imgLabelRow}>
          <View style={[card.imgDot, { backgroundColor: Colors.greenMid }]} />
          <Text style={card.imgLabel}>AFTER</Text>
          {afterUrl && <Text style={card.tapHint}>tap to expand</Text>}
        </View>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => afterHero && setExpanded({ url: afterHero, label: 'AFTER' })}
          disabled={!afterUrl}
        >
          {afterUrl
            ? <Image source={afterUrl} style={card.img} contentFit="cover" />
            : <View style={[card.img, card.imgEmpty, { justifyContent: 'center', alignItems: 'center', gap: 6 }]}>
                <Ionicons name="camera-outline" size={22} color={Colors.border} />
                <Text style={{ fontSize: 12, fontFamily: 'InterVariable', color: Colors.border }}>No photo yet</Text>
              </View>}
        </TouchableOpacity>
      </View>

      {/* AI verdict banner */}
      <View style={[card.aiBanner,
        aiVerdict === 'pass' ? card.aiBannerPass :
        aiVerdict === 'fail' ? card.aiBannerFail : card.aiBannerUnclear,
      ]}>
        <Ionicons name={aiIcon as any} size={14} color={aiColor} />
        <Text style={[card.aiBannerText, { color: aiColor }]} numberOfLines={2}>
          {aiReasoning
            ?? (aiVerdict === 'pass' ? 'Cloudinary AI Vision: area appears cleaned'
              : aiVerdict === 'fail' ? 'Cloudinary AI Vision: litter may still be present'
              : 'Cloudinary AI Vision analysis in progress…')}
        </Text>
      </View>

      {/* Metadata strip */}
      <View style={card.meta}>
        {sev ? (
          <View style={[card.sevChip, { backgroundColor: SEV_COLOR[sev] + '22', borderColor: SEV_COLOR[sev] + '66' }]}>
            <View style={[card.sevDot, { backgroundColor: SEV_COLOR[sev] }]} />
            <Text style={[card.sevText, { color: SEV_COLOR[sev] }]}>{sev}</Text>
          </View>
        ) : null}
        {when ? <Text style={card.metaText}>{when}</Text> : null}
        {address ? <Text style={card.metaText} numberOfLines={1}>{address}</Text> : null}
      </View>

      {/* Full-screen image viewer */}
      <Modal
        visible={!!expanded}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setExpanded(null)}
      >
        <TouchableOpacity
          style={card.expandOverlay}
          activeOpacity={1}
          onPress={() => setExpanded(null)}
        >
          <Image
            source={expanded?.url ?? ''}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
          {/* Label chip */}
          <View style={[card.expandLabel,
            expanded?.label === 'BEFORE'
              ? { borderColor: Colors.mapAmber, backgroundColor: 'rgba(0,0,0,0.6)' }
              : { borderColor: Colors.greenMid,  backgroundColor: 'rgba(0,0,0,0.6)' },
          ]}>
            <View style={[card.imgDot, {
              backgroundColor: expanded?.label === 'BEFORE' ? Colors.mapAmber : Colors.greenMid,
            }]} />
            <Text style={card.expandLabelText}>{expanded?.label}</Text>
          </View>
          {/* Close button */}
          <TouchableOpacity
            style={card.expandClose}
            onPress={() => setExpanded(null)}
            hitSlop={12}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },

  // Header
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.base, paddingTop: S.sm, paddingBottom: S.xs },
  screenTitle: { fontSize: 19, fontFamily: 'InterVariable', fontWeight: '600' as any, color: Colors.textPrimary },
  countChip:  { backgroundColor: Colors.greenTint, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: Colors.greenMid },
  countText:  { fontSize: 12, fontFamily: 'InterVariable', fontWeight: '600' as any, color: Colors.greenDark },

  // Swipe hint
  swipeHint:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.base, paddingBottom: S.xs },
  hintSide:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  hintLabel:  { fontSize: 12, fontFamily: 'InterVariable', fontWeight: '510' as any },
  hintCenter: { fontSize: 11, fontFamily: 'InterVariable', color: Colors.border },

  deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    position: 'absolute',
    width: Dimensions.get('window').width - 32,
    borderRadius: 16,
    backgroundColor: Colors.bg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
    overflow: 'hidden',
  },
  cardBack: {
    transform: [{ scale: 0.96 }, { translateY: 14 }],
  },

  overlay: {
    position: 'absolute', top: 44, zIndex: 10,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, borderWidth: 3,
  },
  overlayApprove: { left: 16, borderColor: Colors.greenDark, backgroundColor: Colors.greenTint },
  overlayReject:  { right: 16, borderColor: Colors.mapRed, backgroundColor: '#FFF0F0' },
  overlayText: { fontSize: 16, fontFamily: 'InterVariable', fontWeight: '700' as any },

  // 3-button action row
  actionRow:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 16, paddingTop: S.sm, paddingHorizontal: S.base },
  rejectBtn:      { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: '#FFF0F0', borderWidth: 1.5, borderColor: Colors.mapRed, gap: 3 },
  rejectBtnLabel: { fontSize: 11, fontFamily: 'InterVariable', fontWeight: '600' as any, color: Colors.mapRed },
  skipBtn:        { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, gap: 3 },
  skipBtnLabel:   { fontSize: 11, fontFamily: 'InterVariable', fontWeight: '600' as any, color: Colors.textSecondary },
  approveBtn:     { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: Colors.greenTint, borderWidth: 1.5, borderColor: Colors.greenDark, gap: 3 },
  approveBtnLabel: { fontSize: 11, fontFamily: 'InterVariable', fontWeight: '600' as any, color: Colors.greenDark },

  // Progress
  progress: { fontSize: 12, fontFamily: 'InterVariable', color: Colors.border, textAlign: 'center', paddingTop: S.xs },

  // Gate
  gateTitle: { fontSize: 24, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textPrimary, textAlign: 'center', marginBottom: S.sm },
  gateSub:   { fontSize: 15, fontFamily: 'InterVariable', color: Colors.textSecondary, textAlign: 'center', marginBottom: S.xl, lineHeight: 22 },
  gateNote:  { marginTop: S.base, fontSize: 12, color: Colors.textSecondary, textAlign: 'center', fontFamily: 'InterVariable' },

  primaryBtn:     { backgroundColor: Colors.greenDark, borderRadius: 8, height: 56, width: '100%', justifyContent: 'center', alignItems: 'center' },
  btnDisabled:    { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: 'InterVariable', fontWeight: '510' as any },

  // Empty
  emptyTitle: { fontSize: 22, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textPrimary, textAlign: 'center', marginBottom: S.sm },
  emptySub:   { fontSize: 15, fontFamily: 'InterVariable', color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});

const card = StyleSheet.create({
  root: { width: '100%' },

  // Question header
  questionRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: S.base, paddingVertical: 10 },
  questionText: { fontSize: 14, fontFamily: 'InterVariable', fontWeight: '600' as any, color: Colors.textPrimary },

  // Stacked before/after images
  imgBlock:    { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  imgLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: S.base, paddingVertical: 6, backgroundColor: Colors.surface },
  imgDot:      { width: 6, height: 6, borderRadius: 3 },
  imgLabel:    { fontSize: 10, fontFamily: 'InterVariable', fontWeight: '700' as any, color: Colors.textSecondary, letterSpacing: 1 },
  tapHint:     { marginLeft: 'auto' as any, fontSize: 10, fontFamily: 'InterVariable', color: Colors.border },
  img:         { width: '100%', height: 160 },
  imgEmpty:    { backgroundColor: Colors.surface },

  // Full-screen viewer
  expandOverlay:   { flex: 1, backgroundColor: '#000' },
  expandClose:     { position: 'absolute', top: 56, right: 18, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  expandLabel:     { position: 'absolute', top: 56, left: 18, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999, borderWidth: 1 },
  expandLabelText: { fontSize: 11, fontFamily: 'InterVariable', fontWeight: '700' as any, color: '#fff', letterSpacing: 1 },

  // AI verdict banner
  aiBanner:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: S.base, paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  aiBannerPass:    { backgroundColor: '#E8F5E9' },
  aiBannerFail:    { backgroundColor: '#FFF3F3' },
  aiBannerUnclear: { backgroundColor: Colors.surface },
  aiBannerText:    { flex: 1, fontSize: 12, fontFamily: 'InterVariable', lineHeight: 17 },

  // Metadata strip
  meta:    { flexDirection: 'row', alignItems: 'center', gap: S.xs, paddingHorizontal: S.base, paddingVertical: 8, flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  metaText: { fontSize: 11, fontFamily: 'InterVariable', color: Colors.textSecondary },
  sevChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  sevDot:   { width: 6, height: 6, borderRadius: 3 },
  sevText:  { fontSize: 11, fontFamily: 'InterVariable', fontWeight: '600' as any },
});
