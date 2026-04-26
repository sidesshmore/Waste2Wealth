import {
  View, Text, FlatList, Modal, StyleSheet, TouchableOpacity,
  Dimensions, ActivityIndicator, TextInput, SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { LitterDetailModal } from '../../components/LitterDetailModal';
import { buildThumb } from '../../lib/cloudinary';
import { Colors } from '../../constants/colors';
import { S } from '../../constants/spacing';
import EventsScreen from './events';

const { width: W } = Dimensions.get('window');
const H_PAD    = S.base;
const COL_GAP  = S.sm;
const CARD_W   = (W - H_PAD * 2 - COL_GAP) / 2;
const PHOTO_H  = CARD_W * 1.15;

const SEV_COLOR: Record<string, string> = {
  Minor:    Colors.greenMid,
  Moderate: Colors.mapAmber,
  Major:    Colors.mapRed,
};

const FILTERS = ['All', 'Major', 'Moderate', 'Minor'] as const;
type Filter = (typeof FILTERS)[number];

export default function GalleryScreen() {
  const [reports, setReports]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<any>(null);
  const [query, setQuery]           = useState('');
  const [activeFilter, setFilter]   = useState<Filter>('All');
  const [showEvents, setShowEvents] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    supabase
      .from('reports')
      .select('*')
      .not('status', 'eq', 'flagged')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setReports(data ?? []); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let r = reports;
    if (activeFilter !== 'All') r = r.filter((x) => x.severity === activeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((x) =>
        [x.object_type, x.litter_category, x.description, x.address, x.brand]
          .some((f) => (f ?? '').toLowerCase().includes(q)),
      );
    }
    return r;
  }, [reports, activeFilter, query]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Gallery</Text>
          {!loading && (
            <Text style={styles.count}>{reports.length} report{reports.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.eventsPill}
          onPress={() => setShowEvents(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="megaphone" size={16} color={Colors.greenDark} />
          <Text style={styles.eventsPillTxt}>Events</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ─────────────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by object, location, brand…"
          placeholderTextColor={Colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {/* ── Filters ────────────────────────────────────────────── */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = f === activeFilter;
          const dot = f !== 'All' ? SEV_COLOR[f] : null;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, active && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              {dot ? (
                <View style={[styles.filterDot, { backgroundColor: active ? '#fff' : dot }]} />
              ) : null}
              <Text style={[styles.filterTxt, active && styles.filterTxtActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Grid ───────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.greenDark} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.colWrap}
          ItemSeparatorComponent={() => <View style={{ height: COL_GAP }} />}
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{query || activeFilter !== 'All' ? '🔍' : '🌿'}</Text>
              <Text style={styles.emptyTitle}>
                {query || activeFilter !== 'All' ? 'No matches' : 'Nothing here yet'}
              </Text>
              <Text style={styles.emptySub}>
                {query || activeFilter !== 'All'
                  ? 'Try a different search or filter.'
                  : 'Tap the camera tab to log your first report.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const src = item.photo_public_id ? buildThumb(item.photo_public_id) : item.photo_url;
            const label = item.object_type ?? item.litter_category ?? 'Litter';
            const sev = item.severity as string | undefined;

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setSelected(item)}
                activeOpacity={0.85}
              >
                {/* Photo */}
                <Image source={src} style={styles.photo} contentFit="cover" />

                {/* Severity dot overlay — top-right corner, tiny */}
                {sev ? (
                  <View style={[styles.sevDot, { backgroundColor: SEV_COLOR[sev] ?? Colors.greenMid }]} />
                ) : null}

                {/* Label below photo */}
                <Text style={styles.cardLabel} numberOfLines={1}>{label}</Text>
                {sev ? (
                  <Text style={[styles.cardSev, { color: SEV_COLOR[sev] ?? Colors.textSecondary }]}>{sev}</Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Detail modal ──────────────────────────────────────────── */}
      <Modal
        visible={!!selected}
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <LitterDetailModal report={selected ?? {}} onClose={() => setSelected(null)} />
      </Modal>

      {/* ── Events modal ──────────────────────────────────────────── */}
      <Modal
        visible={showEvents}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEvents(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
          <EventsScreen onClose={() => setShowEvents(false)} />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },

  // Header
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingTop:  S.sm,
    paddingBottom: S.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           S.sm,
  },
  title: {
    fontSize:   26,
    fontFamily: 'InterVariable',
    fontWeight: '700' as any,
    color:      Colors.textPrimary,
  },
  count: {
    fontSize:   13,
    fontFamily: 'InterVariable',
    color:      Colors.textSecondary,
  },
  eventsPill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.greenTint,
    borderRadius:    9999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  eventsPillTxt: {
    fontFamily:    'InterVariable',
    fontWeight:    '590' as any,
    fontSize:      15,
    color:         Colors.greenDark,
    letterSpacing: -0.1,
  },

  // Search
  searchWrap: {
    flexDirection:  'row',
    alignItems:     'center',
    marginHorizontal: H_PAD,
    marginBottom:   S.sm,
    backgroundColor: Colors.surface,
    borderRadius:   10,
    paddingHorizontal: S.sm,
    height:         40,
  },
  searchIcon:  { marginRight: S.xs },
  searchInput: {
    flex:       1,
    fontSize:   14,
    fontFamily: 'InterVariable',
    color:      Colors.textPrimary,
    height:     40,
  },

  // Filters
  filterRow: {
    flexDirection:     'row',
    paddingHorizontal: H_PAD,
    paddingVertical:   6,
    gap:               S.xs,
    marginBottom:      S.sm,
  },
  filterChip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    borderRadius:    9999,
    paddingHorizontal: 13,
    paddingVertical:  6,
    backgroundColor: Colors.surface,
  },
  filterChipActive: { backgroundColor: Colors.greenDark },
  filterDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  filterTxt: {
    fontSize:   13,
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
    color:      Colors.textSecondary,
  },
  filterTxtActive: { color: '#fff' },

  // Grid
  listPad:  { paddingHorizontal: H_PAD, paddingBottom: S.xl },
  colWrap:  { gap: COL_GAP },

  // Card — photo + plain text below, no box
  card: { width: CARD_W },
  photo: {
    width:        CARD_W,
    height:       PHOTO_H,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  sevDot: {
    position:     'absolute',
    top:          S.xs + 2,
    right:        S.xs + 2,
    width:        8,
    height:       8,
    borderRadius: 4,
    borderWidth:  1.5,
    borderColor:  '#fff',
  },
  cardLabel: {
    marginTop:  S.xs,
    fontSize:   12,
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
    color:      Colors.textPrimary,
  },
  cardSev: {
    fontSize:   11,
    fontFamily: 'InterVariable',
    marginTop:  1,
  },

  // Empty
  empty: {
    alignItems:        'center',
    paddingTop:        80,
    paddingHorizontal: 40,
  },
  emptyIcon:  { fontSize: 36, marginBottom: S.sm },
  emptyTitle: {
    fontSize:     16,
    fontFamily:   'InterVariable',
    fontWeight:   '600' as any,
    color:        Colors.textPrimary,
    marginBottom: S.xs,
  },
  emptySub: {
    fontSize:   13,
    fontFamily: 'InterVariable',
    color:      Colors.textSecondary,
    textAlign:  'center',
    lineHeight: 19,
  },
});
