import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, ActivityIndicator,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { S } from '../../constants/spacing';
import { Keypair } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { api } from '../../lib/api';

const SOL_USD = 150;

interface UserInfo {
  wallet_address: string | null;
  sol_earned:     number;
  reputation:     number;
  world_id_nullifier: string | null;
}

interface Transaction {
  id:           string;
  amount_sol:   number;
  type:         'cleaner' | 'reporter' | 'verifier';
  tx_signature: string | null;
  cleanup_id:   string | null;
  created_at:   string;
}

const TYPE_LABEL: Record<string, string> = {
  cleaner:  'Cleanup Reward',
  reporter: 'Report Reward',
  verifier: 'Verify Reward',
};

const TYPE_ICON: Record<string, string> = {
  cleaner:  'leaf',
  reporter: 'camera',
  verifier: 'shield-checkmark',
};

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function useCountUp(target: number, duration = 1400) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (target === 0) { setDisplay(0); prev.current = 0; return; }
    const from = prev.current;
    prev.current = target;
    const steps = Math.ceil(duration / 16);
    let step = 0;
    const id = setInterval(() => {
      step++;
      const t = step / steps;
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (step >= steps) { setDisplay(target); clearInterval(id); }
    }, 16);
    return () => clearInterval(id);
  }, [target]);
  return display;
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const [userInfo, setUserInfo]     = useState<UserInfo | null>(null);
  const [transactions, setTxns]     = useState<Transaction[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const balance    = userInfo?.sol_earned ?? 0;
  const displaySol = useCountUp(balance);
  const isVerified = !!userInfo?.world_id_nullifier;

  async function loadData() {
    try {
      const [meRes, histRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/rewards/history'),
      ]);
      let me: UserInfo = meRes.data;
      // Auto-generate a Solana wallet for users who don't have one yet
      if (!me.wallet_address) {
        const kp = Keypair.generate();
        await SecureStore.setItemAsync('solana_secret_key', Buffer.from(kp.secretKey).toString('base64'));
        await api.post('/users/wallet', { wallet_address: kp.publicKey.toString() });
        me = { ...me, wallet_address: kp.publicKey.toString() };
      }
      setUserInfo(me);
      setTxns(histRes.data ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { loadData(); }, []);

  function onRefresh() { setRefreshing(true); loadData(); }

  function openExplorer(sig: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    WebBrowser.openBrowserAsync(`https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  }

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.greenDark} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.greenDark} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title ─────────────────────────────────────────────────── */}
        <Text style={styles.pageTitle}>Wallet</Text>

        {/* ── Balance card ──────────────────────────────────────────── */}
        <View style={styles.cardShadow}>
          <View style={styles.card}>
            <View style={styles.cardInner}>

              {/* Label row */}
              <View style={styles.cardLabelRow}>
                <Text style={styles.cardLabel}>Your Balance</Text>
                <View style={styles.networkBadge}>
                  <Text style={styles.networkBadgeTxt}>DEVNET</Text>
                </View>
              </View>

              {/* Hero SOL amount */}
              <Text style={styles.solAmount}>
                {displaySol.toFixed(4)}
                <Text style={styles.solSuffix}> SOL</Text>
              </Text>
              <Text style={styles.usdAmount}>
                ≈ ${(displaySol * SOL_USD).toFixed(2)} USD
              </Text>

              <View style={styles.divider} />

              {/* Wallet address + verified */}
              <View style={styles.addressRow}>
                <View style={styles.addressBlock}>
                  <Text style={styles.addressLabel}>Address</Text>
                  <Text style={styles.addressValue}>
                    {userInfo?.wallet_address
                      ? truncateAddress(userInfo.wallet_address)
                      : 'Not generated'}
                  </Text>
                </View>
                {isVerified && (
                  <View style={styles.verifiedPill}>
                    <Ionicons name="checkmark-circle" size={13} color={Colors.greenDark} />
                    <Text style={styles.verifiedTxt}>Verified Human</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ── Reputation + network stat strip ───────────────────────── */}
        <View style={styles.statStrip}>
          <View style={[styles.statBox, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: Colors.border }]}>
            <Text style={styles.statValue}>{userInfo?.reputation ?? '—'}</Text>
            <Text style={styles.statLabel}>Reputation</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.solPurple }]}>
              {transactions.length}
            </Text>
            <Text style={styles.statLabel}>Rewards Earned</Text>
          </View>
        </View>

        {/* ── Recent Activity ────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Recent Activity</Text>

        {transactions.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="wallet-outline" size={32} color={Colors.greenMid} />
            </View>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyBody}>
              Report litter or clean up a site{'\n'}to start earning SOL.
            </Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {transactions.map((tx) => (
              <Pressable
                key={tx.id}
                style={({ pressed }) => [styles.txRow, pressed && { opacity: 0.65 }]}
                onPress={() => tx.tx_signature && openExplorer(tx.tx_signature)}
                hitSlop={4}
              >
                {/* Icon */}
                <View style={styles.txIconWrap}>
                  <Ionicons
                    name={(TYPE_ICON[tx.type] ?? 'ellipse') as any}
                    size={18}
                    color={Colors.greenDark}
                  />
                </View>

                {/* Label + time */}
                <View style={styles.txMid}>
                  <Text style={styles.txType}>{TYPE_LABEL[tx.type] ?? tx.type}</Text>
                  <Text style={styles.txTime}>{timeAgo(tx.created_at)}</Text>
                </View>

                {/* Amount + arrow */}
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>+{tx.amount_sol.toFixed(4)}</Text>
                  <Text style={styles.txAmountSuffix}>SOL</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: S.base, paddingBottom: 60 },

  // ── Page title ────────────────────────────────────────────────────────────
  pageTitle: {
    fontFamily:    'InterVariable',
    fontWeight:    '510' as any,
    fontSize:      32,
    letterSpacing: -0.5,
    color:         Colors.textPrimary,
    marginTop:     S.xl,
    marginBottom:  S.xl,
  },

  // ── Balance card ──────────────────────────────────────────────────────────
  cardShadow: {
    borderRadius:  20,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius:  12,
    elevation:     6,
    marginBottom:  S.md,
  },
  card: {
    backgroundColor: Colors.bg,
    borderRadius:    20,
    overflow:        'hidden',
  },
  cardInner: {
    padding: 24,
  },

  cardLabelRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   16,
  },
  cardLabel: {
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
    fontSize:   14,
    color:      Colors.textSecondary,
    letterSpacing: -0.1,
  },
  networkBadge: {
    backgroundColor: '#F3F0FF',
    borderRadius:    6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  networkBadgeTxt: {
    fontFamily:    'JetBrainsMono-Bold',
    fontSize:      11,
    color:         Colors.solPurple,
    letterSpacing: 0.5,
  },

  // Hero number
  solAmount: {
    fontFamily:    'JetBrainsMono-Bold',
    fontSize:      52,
    lineHeight:    60,
    letterSpacing: -1,
    color:         Colors.solPurple,
  },
  solSuffix: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize:   26,
    color:      Colors.solPurple,
  },
  usdAmount: {
    fontFamily:   'InterVariable',
    fontSize:     17,
    color:        Colors.textSecondary,
    marginTop:    6,
    marginBottom: 4,
  },

  divider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical:  20,
  },

  addressRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  addressBlock: { gap: 3 },
  addressLabel: {
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
    fontSize:   11,
    color:      Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as any,
  },
  addressValue: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize:   14,
    color:      Colors.textPrimary,
    letterSpacing: 0,
  },
  verifiedPill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    backgroundColor: Colors.greenTint,
    borderRadius:    9999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  verifiedTxt: {
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
    fontSize:   13,
    color:      Colors.greenDark,
  },

  // ── Stat strip ────────────────────────────────────────────────────────────
  statStrip: {
    flexDirection:   'row',
    backgroundColor: Colors.surface,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     Colors.border,
    marginBottom:    S.xl,
    overflow:        'hidden',
  },
  statBox: {
    flex:            1,
    paddingVertical: 16,
    alignItems:      'center',
    gap:             4,
  },
  statValue: {
    fontFamily:    'InterVariable',
    fontWeight:    '590' as any,
    fontSize:      22,
    color:         Colors.textPrimary,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: 'InterVariable',
    fontSize:   12,
    color:      Colors.textSecondary,
    letterSpacing: -0.1,
  },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: {
    fontFamily:    'InterVariable',
    fontWeight:    '590' as any,
    fontSize:      22,
    color:         Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom:  S.md,
  },

  // ── Transaction rows ──────────────────────────────────────────────────────
  txList: { gap: S.sm },
  txRow: {
    backgroundColor: Colors.bg,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     Colors.border,
    paddingVertical: 14,
    paddingHorizontal: S.base,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
  },
  txIconWrap: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: Colors.greenTint,
    justifyContent:  'center',
    alignItems:      'center',
  },
  txMid:  { flex: 1, gap: 3 },
  txType: {
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
    fontSize:   16,
    color:      Colors.textPrimary,
  },
  txTime: {
    fontFamily: 'InterVariable',
    fontSize:   13,
    color:      Colors.textSecondary,
  },
  txRight: {
    alignItems: 'flex-end',
    gap:        2,
  },
  txAmount: {
    fontFamily:    'JetBrainsMono-Bold',
    fontSize:      20,
    color:         Colors.solGreen,
    letterSpacing: -0.3,
  },
  txAmountSuffix: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize:   11,
    color:      Colors.solGreen,
    letterSpacing: 0.3,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  empty: {
    alignItems:     'center',
    paddingVertical: 48,
    gap:            12,
  },
  emptyIconWrap: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: Colors.greenTint,
    justifyContent:  'center',
    alignItems:      'center',
    marginBottom:    4,
  },
  emptyTitle: {
    fontFamily:    'InterVariable',
    fontWeight:    '510' as any,
    fontSize:      20,
    color:         Colors.textPrimary,
    letterSpacing: -0.2,
  },
  emptyBody: {
    fontFamily: 'InterVariable',
    fontSize:   15,
    color:      Colors.textSecondary,
    textAlign:  'center',
    lineHeight: 22,
  },
});
