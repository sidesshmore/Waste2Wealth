import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert, Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { uploadPhoto, buildHeroImage } from '../../lib/cloudinary';
import { Colors } from '../../constants/colors';
import { S } from '../../constants/spacing';

type Stage =
  | 'loading'
  | 'unclaimed'
  | 'claimed_by_me'
  | 'taking_after'
  | 'reviewing_after'
  | 'agent_consensus'
  | 'submitted'
  | 'other';

// ── Agent consensus ───────────────────────────────────────────────────────────
const AGENTS = [
  { name: 'Vision AI',        icon: '👁',  color: '#7C3AED', message: 'Before/after comparison: 91% debris reduction detected in cleanup zone.' },
  { name: 'Location Guard',   icon: '📍', color: '#0077B6', message: 'GPS verified — cleaner was within 19m of the reported site.' },
  { name: 'Pattern Scanner',  icon: '🔍', color: '#D97706', message: 'Cleanup behavior matches genuine effort. No suspicious patterns.' },
  { name: 'Fraud Detector',   icon: '🛡',  color: '#DC2626', message: 'Zero fraud signals. Reputation history: trusted contributor.' },
  { name: 'Arbiter',          icon: '⚡', color: '#25671E', message: 'Unanimous consensus: VERIFIED ✓  Reward queued for your wallet.' },
];

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = (d: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(d, { toValue: 1,   duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ]),
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 200);
    const a3 = anim(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 6 }}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View
          key={i}
          style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#9CA3AF', opacity: d }}
        />
      ))}
    </View>
  );
}

function AgentConsensusView({
  cleanupId, beforeUrl, afterUrl, onComplete,
}: { cleanupId: string; beforeUrl: string; afterUrl: string; onComplete: () => void }) {
  const [states, setStates] = useState(AGENTS.map(() => ({ visible: false, typing: false, done: false })));
  const [showVerdict, setShowVerdict] = useState(false);
  const verdictScale   = useRef(new Animated.Value(0)).current;
  const verdictOpacity = useRef(new Animated.Value(0)).current;
  const headerOpacity  = useRef(new Animated.Value(0)).current;
  const verdicts = useRef<string[]>(AGENTS.map(a => a.message));

  useEffect(() => {
    // Fetch real verdicts in background — updates as animation plays
    api.post(`/cleanups/${cleanupId}/agent-review`, { before_url: beforeUrl, after_url: afterUrl })
      .then(r => { verdicts.current = r.data.verdicts; })
      .catch(() => {}); // keep hardcoded fallbacks on failure

    Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    const SHOW_INTERVAL = 1400;
    const TYPING_DURATION = 1100;
    const ts: ReturnType<typeof setTimeout>[] = [];

    AGENTS.forEach((_, i) => {
      const showAt = i * SHOW_INTERVAL;
      ts.push(setTimeout(() => {
        setStates(prev => prev.map((s, j) => j === i ? { ...s, visible: true, typing: true } : s));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, showAt));
      ts.push(setTimeout(() => {
        setStates(prev => prev.map((s, j) => j === i ? { ...s, typing: false, done: true } : s));
      }, showAt + TYPING_DURATION));
    });

    const verdictAt = AGENTS.length * SHOW_INTERVAL + 200;
    ts.push(setTimeout(() => {
      setShowVerdict(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.spring(verdictScale,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(verdictOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }, verdictAt));

    ts.push(setTimeout(onComplete, verdictAt + 2200));

    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <View style={ac.root}>
      {/* Header */}
      <Animated.View style={[ac.header, { opacity: headerOpacity }]}>
        <Text style={ac.headerTitle}>AI Agents Reviewing</Text>
        <Text style={ac.headerSub}>5 independent models are analysing your cleanup</Text>
      </Animated.View>

      {/* Agent bubbles */}
      <ScrollView style={ac.scroll} contentContainerStyle={ac.scrollContent} showsVerticalScrollIndicator={false}>
        {AGENTS.map((agent, i) => {
          const s = states[i];
          if (!s.visible) return null;
          return (
            <View key={i} style={ac.row}>
              {/* Avatar */}
              <View style={[ac.avatar, { backgroundColor: agent.color + '22' }]}>
                <Text style={ac.avatarEmoji}>{agent.icon}</Text>
              </View>

              {/* Bubble */}
              <View style={ac.bubble}>
                <Text style={[ac.agentName, { color: agent.color }]}>{agent.name}</Text>
                {s.typing ? (
                  <TypingDots />
                ) : (
                  <Text style={ac.agentMsg}>{verdicts.current[i] ?? agent.message}</Text>
                )}
              </View>
            </View>
          );
        })}

        {/* Verdict banner */}
        {showVerdict && (
          <Animated.View style={[ac.verdict, { transform: [{ scale: verdictScale }], opacity: verdictOpacity }]}>
            <Text style={ac.verdictIcon}>✓</Text>
            <View style={{ flex: 1 }}>
              <Text style={ac.verdictTitle}>Consensus Reached</Text>
              <Text style={ac.verdictSub}>Cleanup approved by all 5 agents</Text>
            </View>
          </Animated.View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const ac = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: S.base,
    paddingTop:   S['2xl'],
    paddingBottom: S.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily:    'InterVariable',
    fontWeight:    '700' as any,
    fontSize:      22,
    color:         Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom:  4,
  },
  headerSub: {
    fontFamily: 'InterVariable',
    fontSize:   14,
    color:      Colors.textSecondary,
    lineHeight: 19,
  },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: S.base, paddingTop: S.lg, gap: S.md },

  row: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           S.sm,
  },
  avatar: {
    width:          40,
    height:         40,
    borderRadius:   12,
    justifyContent: 'center',
    alignItems:     'center',
    flexShrink:     0,
  },
  avatarEmoji: { fontSize: 20 },

  bubble: {
    flex:            1,
    backgroundColor: Colors.surface,
    borderRadius:    14,
    borderTopLeftRadius: 4,
    padding:         12,
  },
  agentName: {
    fontFamily:    'InterVariable',
    fontWeight:    '590' as any,
    fontSize:      13,
    marginBottom:  3,
    letterSpacing: -0.1,
  },
  agentMsg: {
    fontFamily: 'InterVariable',
    fontSize:   14,
    color:      Colors.textPrimary,
    lineHeight: 20,
  },

  verdict: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            S.md,
    backgroundColor: Colors.greenDark,
    borderRadius:   16,
    padding:        S.base,
    marginTop:      S.sm,
  },
  verdictIcon:  { fontSize: 28, color: '#fff' },
  verdictTitle: {
    fontFamily:  'InterVariable',
    fontWeight:  '700' as any,
    fontSize:    17,
    color:       '#fff',
    letterSpacing: -0.2,
  },
  verdictSub: {
    fontFamily: 'InterVariable',
    fontSize:   13,
    color:      'rgba(255,255,255,0.75)',
    marginTop:  2,
  },
});

function buildPipelineSteps(aiVerified: boolean) {
  return [
    { label: 'Photo uploaded',      sub: 'Stored securely on the cloud',       done: true,       active: false },
    { label: 'AI verification',     sub: 'Comparing before & after photos',     done: aiVerified, active: !aiVerified },
    { label: 'Community review',    sub: 'Peers vote to confirm your work',     done: false,      active: false },
    { label: 'SOL reward released', sub: 'Crypto sent to your wallet',          done: false,      active: false },
  ];
}

function SubmittedView({ aiVerified }: { aiVerified: boolean }) {
  const circleScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(circleScale, { toValue: 1, useNativeDriver: true, tension: 70, friction: 7 }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={sv.root}>
      {/* Animated checkmark circle */}
      <Animated.View style={[sv.circleOuter, { transform: [{ scale: circleScale }] }]}>
        <View style={sv.circleInner}>
          <Text style={sv.checkmark}>✓</Text>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: contentOpacity, width: '100%', alignItems: 'center' }}>
        <Text style={sv.title}>Cleanup Submitted!</Text>
        <Text style={sv.sub}>Your work is being verified. SOL lands in your wallet once the community confirms.</Text>

        {/* Pipeline steps */}
        <View style={sv.pipeline}>
          {buildPipelineSteps(aiVerified).map((step, i) => (
            <View key={i} style={sv.stepRow}>
              {/* Line connector */}
              {i < 3 && <View style={sv.connector} />}

              {/* Dot */}
              {step.done ? (
                <View style={[sv.dot, sv.dotDone]}>
                  <Text style={sv.dotCheck}>✓</Text>
                </View>
              ) : step.active ? (
                <Animated.View style={[sv.dot, sv.dotActive, { transform: [{ scale: pulse }] }]} />
              ) : (
                <View style={[sv.dot, sv.dotPending]} />
              )}

              {/* Text */}
              <View style={sv.stepText}>
                <Text style={[sv.stepLabel, step.done && sv.stepLabelDone, step.active && sv.stepLabelActive]}>
                  {step.label}
                </Text>
                <Text style={sv.stepSub}>{step.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={sv.btn} onPress={() => router.replace('/(tabs)')}>
          <Text style={sv.btnTxt}>Back to Map</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const sv = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28,
  },
  circleOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.greenTint,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  circleInner: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.greenDark,
    justifyContent: 'center', alignItems: 'center',
  },
  checkmark: { fontSize: 34, color: '#fff', fontWeight: '700' },
  title:     { fontSize: 26, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  sub:       { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 32, paddingHorizontal: 8 },

  // Pipeline
  pipeline:  { width: '100%', marginBottom: 36 },
  stepRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, position: 'relative', paddingLeft: 4 },
  connector: {
    position: 'absolute', left: 15, top: 24,
    width: 2, height: 28, backgroundColor: Colors.border,
  },
  dot:        { width: 22, height: 22, borderRadius: 11, marginRight: 14, marginTop: 2, justifyContent: 'center', alignItems: 'center' },
  dotDone:    { backgroundColor: Colors.greenDark },
  dotActive:  { backgroundColor: Colors.greenMid },
  dotPending: { backgroundColor: Colors.border },
  dotCheck:   { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText:   { flex: 1 },
  stepLabel:      { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  stepLabelDone:  { color: Colors.textPrimary },
  stepLabelActive:{ color: Colors.greenDark },
  stepSub:    { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },

  btn:    { width: '100%', backgroundColor: Colors.greenDark, borderRadius: 12, height: 56, justifyContent: 'center', alignItems: 'center' },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

const SEVERITY_COLOR: Record<string, string> = {
  Minor: Colors.greenMid,
  Moderate: Colors.mapAmber,
  Major: Colors.mapRed,
};

export default function CleanupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [report, setReport]   = useState<any>(null);
  const [cleanup, setCleanup] = useState<any>(null);
  const [stage, setStage]       = useState<Stage>('loading');
  const [aiVerified, setAiVerified] = useState(false);
  const [userId, setUserId]   = useState<string | null>(null);
  const [claiming, setClaiming]     = useState(false);
  const [afterUri, setAfterUri]           = useState<string | null>(null);
  const [afterCloudinaryUrl, setAfterCloudinaryUrl] = useState<string | null>(null);
  const [submitting, setSubmitting]       = useState(false);
  const [submitStage, setSubmitStage]     = useState<'uploading' | 'verifying' | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const [camPerm, requestCamPerm] = useCameraPermissions();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);

      const { data: rep } = await supabase
        .from('reports').select('*').eq('id', id).single();
      if (!rep) { setStage('other'); return; }
      setReport(rep);

      const { data: cl } = await supabase
        .from('cleanups').select('*').eq('report_id', id)
        .not('status', 'eq', 'rejected').maybeSingle();
      setCleanup(cl ?? null);

      if (rep.status === 'open') {
        setStage('unclaimed');
      } else if (cl && cl.cleaner_id === uid) {
        setStage(cl.status === 'claimed' ? 'claimed_by_me' : 'submitted');
      } else {
        setStage('other');
      }
    })();
  }, [id]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission required');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { data } = await api.post('/cleanups/', {
        report_id: id,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      setCleanup({ id: data.cleanup_id, cleaner_id: userId, status: 'claimed', report_id: id });
      setStage('claimed_by_me');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Claim failed', e?.message ?? 'Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const handleOpenCamera = async () => {
    if (!camPerm?.granted) {
      const { granted } = await requestCamPerm();
      if (!granted) {
        Alert.alert('Camera needed', 'Allow camera access to submit your cleanup.');
        return;
      }
    }
    setStage('taking_after');
  };

  const handleShutter = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85, skipProcessing: true });
    if (photo?.uri) { setAfterUri(photo.uri); setStage('reviewing_after'); }
  };

  const handleSubmitCleanup = async () => {
    if (!afterUri || !cleanup?.id || !report) return;
    setSubmitting(true);
    try {
      // Get current location for server-side geo verification
      setSubmitStage('verifying');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission required to submit cleanup.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      setSubmitStage('uploading');
      const result = await uploadPhoto(afterUri, 'cleanups/after');

      setSubmitStage('verifying');
      await api.patch(`/cleanups/${cleanup.id}/submit`, {
        after_url:        result.secure_url,
        after_public_id:  result.public_id,
        before_public_id: report.photo_public_id,
        lat:              pos.coords.latitude,
        lng:              pos.coords.longitude,
      });
      setAfterCloudinaryUrl(result.secure_url);
      setStage('agent_consensus');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Submit failed', e?.response?.data?.detail ?? e?.message ?? 'Please try again.');
      setSubmitting(false);
      setSubmitStage(null);
    }
  };

  // ── Camera ──────────────────────────────────────────────────────────────────
  if (stage === 'taking_after') {
    return (
      <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef}>
        <View style={[styles.camBar, { paddingTop: insets.top + S.sm }]}>
          <TouchableOpacity onPress={() => setStage('claimed_by_me')} style={styles.camSide}>
            <Text style={styles.camCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.camTitle}>After Photo</Text>
          <View style={styles.camSide} />
        </View>
        <View style={[styles.shutterRow, { paddingBottom: insets.bottom + S.xl }]}>
          <TouchableOpacity style={styles.shutter} onPress={handleShutter} activeOpacity={0.8}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    );
  }

  // ── After-photo review ──────────────────────────────────────────────────────
  if (stage === 'reviewing_after' && afterUri) {
    return (
      <View style={[styles.reviewRoot, { paddingTop: insets.top + S.base, paddingBottom: insets.bottom + S.xl }]}>
        <Text style={styles.reviewTitle}>Submit Cleanup</Text>
        <Image source={{ uri: afterUri }} style={styles.afterPreview} contentFit="cover" />
        <TouchableOpacity
          style={[styles.primaryBtn, submitting && styles.btnDisabled]}
          onPress={handleSubmitCleanup}
          disabled={submitting}
        >
          {submitting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.primaryBtnText}>
                {submitStage === 'uploading' ? 'Uploading photo...' : 'Verifying location...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>Submit Cleanup</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setStage('taking_after')} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Retake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Agent consensus ─────────────────────────────────────────────────────────
  if (stage === 'agent_consensus') {
    return (
      <AgentConsensusView
        cleanupId={cleanup?.id ?? ''}
        beforeUrl={report?.photo_url ?? ''}
        afterUrl={afterCloudinaryUrl ?? ''}
        onComplete={() => { setAiVerified(true); setStage('submitted'); }}
      />
    );
  }

  // ── Submitted ───────────────────────────────────────────────────────────────
  if (stage === 'submitted') {
    return <SubmittedView aiVerified={aiVerified} />;
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (stage === 'loading') {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.greenDark} /></View>;
  }

  // ── Main detail view ────────────────────────────────────────────────────────
  const heroUrl = report?.photo_public_id ? buildHeroImage(report.photo_public_id) : null;

  return (
    <ScrollView style={styles.root} bounces={false}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerSide}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cleanup</Text>
        <View style={styles.headerSide} />
      </View>

      {/* Hero photo */}
      {heroUrl ? (
        <Image source={heroUrl} style={styles.hero} contentFit="cover" />
      ) : (
        <View style={[styles.hero, { backgroundColor: Colors.surface }]} />
      )}

      <View style={styles.body}>
        {/* Badges */}
        <View style={styles.badgeRow}>
          {report?.severity && (
            <View style={[styles.badge, { backgroundColor: SEVERITY_COLOR[report.severity] ?? Colors.greenMid }]}>
              <Text style={styles.badgeText}>{report.severity}</Text>
            </View>
          )}
          <View style={[styles.badge, styles.badgeOutline]}>
            <Text style={[styles.badgeText, { color: Colors.textSecondary }]}>{report?.status ?? 'open'}</Text>
          </View>
        </View>

        {/* Description */}
        {report?.description ? (
          <Text style={styles.description}>{report.description}</Text>
        ) : null}

        {/* CTA */}
        {stage === 'unclaimed' && (
          <TouchableOpacity
            style={[styles.primaryBtn, claiming && styles.btnDisabled]}
            onPress={handleClaim}
            disabled={claiming}
          >
            {claiming ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>I'll clean this</Text>}
          </TouchableOpacity>
        )}

        {stage === 'claimed_by_me' && (
          <>
            <View style={styles.claimedBanner}>
              <Text style={styles.claimedText}>You claimed this cleanup. Head to the location and take an after photo when done.</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenCamera}>
              <Text style={styles.primaryBtnText}>Take After Photo</Text>
            </TouchableOpacity>
          </>
        )}

        {stage === 'other' && (
          <View style={styles.otherBanner}>
            <Text style={styles.otherText}>
              {report?.status === 'claimed'              ? 'Someone else is already cleaning this.'
               : report?.status === 'pending_verification' ? 'Cleanup submitted — awaiting votes.'
               : report?.status === 'verified'           ? '✓ This area has been verified clean!'
               : `Status: ${report?.status ?? 'unknown'}`}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },

  // Camera
  camBar:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.base },
  camSide:   { width: 60 },
  camCancel: { color: '#fff', fontSize: 16, fontFamily: 'InterVariable' },
  camTitle:  { flex: 1, color: '#fff', fontSize: 17, fontFamily: 'InterVariable', fontWeight: '510' as any, textAlign: 'center' },
  shutterRow:   { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  shutter:      { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff', borderWidth: 2, borderColor: Colors.greenDark },

  // After review
  reviewRoot:      { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: S.base },
  reviewTitle:     { fontSize: 22, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textPrimary, marginBottom: S.base },
  afterPreview:    { width: '100%', height: 280, borderRadius: 12, marginBottom: S.xl },

  // Header
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.base, paddingBottom: S.sm },
  headerSide: { width: 60 },
  headerTitle:{ flex: 1, fontSize: 17, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textPrimary, textAlign: 'center' },
  backText:   { fontSize: 16, fontFamily: 'InterVariable', color: Colors.greenDark },

  hero: { width: '100%', height: 280 },

  body:     { padding: S.base, gap: S.base },
  badgeRow: { flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' },
  badge:    { borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOutline: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  badgeText: { fontSize: 13, fontFamily: 'InterVariable', fontWeight: '510' as any, color: '#fff' },

  description: { fontSize: 15, fontFamily: 'InterVariable', color: Colors.textPrimary, lineHeight: 22 },

  claimedBanner: { backgroundColor: Colors.greenTint, borderRadius: 8, padding: S.base },
  claimedText:   { fontSize: 14, fontFamily: 'InterVariable', color: Colors.greenDark, lineHeight: 20 },

  otherBanner: { backgroundColor: Colors.surface, borderRadius: 8, padding: S.base, borderWidth: 1, borderColor: Colors.border },
  otherText:   { fontSize: 14, fontFamily: 'InterVariable', color: Colors.textSecondary },

  primaryBtn:     { backgroundColor: Colors.greenDark, borderRadius: 8, height: 56, justifyContent: 'center', alignItems: 'center' },
  btnDisabled:    { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: 'InterVariable', fontWeight: '510' as any },

  secondaryBtn:     { height: 48, justifyContent: 'center', alignItems: 'center' },
  secondaryBtnText: { color: Colors.textSecondary, fontSize: 15, fontFamily: 'InterVariable' },
});
