import {
  View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity,
  Modal, SafeAreaView,
} from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { S } from '../../constants/spacing';
import { EVENTS, CleanupEvent, EventCategory } from '../../lib/events';

type Filter = 'all' | 'beach' | 'waste';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',   label: 'All' },
  { key: 'beach', label: 'Beach & Park' },
  { key: 'waste', label: 'Waste Drop-off' },
];

const BEACH_CATS: EventCategory[] = ['beach_cleanup', 'bioblitz'];

const CATEGORY_LABEL: Record<EventCategory, string> = {
  beach_cleanup:    'Beach Cleanup',
  bioblitz:         'BioBlitz',
  waste_collection: 'Waste Drop-off',
};

const CATEGORY_ICON: Record<EventCategory, string> = {
  beach_cleanup:    'water-outline',
  bioblitz:         'leaf-outline',
  waste_collection: 'trash-outline',
};

function isPast(date: string) {
  return new Date(date) < new Date(new Date().toDateString());
}

function formatDate(date: string) {
  return new Date(date)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase();
}

function formatDateLong(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function OrgBadge({ org }: { org: string }) {
  const isHTB = org === 'Heal the Bay';
  return (
    <View style={[badge.pill, { backgroundColor: isHTB ? '#E8F4FD' : Colors.greenTint }]}>
      <Text style={[badge.txt, { color: isHTB ? Colors.worldBlue : Colors.greenDark }]}>
        {org}
      </Text>
    </View>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function EventDetail({
  event, onClose,
}: { event: CleanupEvent; onClose: () => void }) {
  const past = isPast(event.date);

  function handleRSVP() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    WebBrowser.openBrowserAsync(event.url);
  }

  return (
    <View style={detail.root}>
      {/* Handle */}
      <View style={detail.handle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={detail.scroll}
        bounces
      >
        {/* Top row */}
        <View style={detail.topRow}>
          <OrgBadge org={event.organization} />
          <TouchableOpacity onPress={onClose} style={detail.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Category pill */}
        <View style={detail.catRow}>
          <Ionicons
            name={CATEGORY_ICON[event.category] as any}
            size={13}
            color={Colors.greenDark}
          />
          <Text style={detail.catTxt}>{CATEGORY_LABEL[event.category]}</Text>
        </View>

        {/* Title */}
        <Text style={detail.title}>{event.title}</Text>

        {/* Date/time block */}
        <View style={detail.dateBlock}>
          <View style={detail.dateBlockRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.greenDark} />
            <Text style={detail.dateBlockTxt}>{formatDateLong(event.date)}</Text>
          </View>
          <View style={detail.dateBlockRow}>
            <Ionicons name="time-outline" size={16} color={Colors.greenDark} />
            <Text style={detail.dateBlockTxt}>{event.time}</Text>
          </View>
        </View>

        {/* Location */}
        <View style={detail.section}>
          <Text style={detail.sectionLabel}>Location</Text>
          <View style={detail.locRow}>
            <Ionicons name="location-outline" size={15} color={Colors.textSecondary} />
            <Text style={detail.locTxt}>{event.location}</Text>
          </View>
        </View>

        <View style={detail.divider} />

        {/* About */}
        <View style={detail.section}>
          <Text style={detail.sectionLabel}>About this event</Text>
          <Text style={detail.desc}>{event.description}</Text>
        </View>

        <View style={detail.divider} />

        {/* Source */}
        <View style={detail.sourceRow}>
          <Ionicons name="link-outline" size={13} color={Colors.textSecondary} />
          <Text style={detail.sourceTxt} numberOfLines={1}>{event.url}</Text>
        </View>

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed RSVP / Past footer */}
      <View style={detail.footer}>
        {past ? (
          <View style={detail.pastBox}>
            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.textSecondary} />
            <Text style={detail.pastTxt}>This event has passed</Text>
          </View>
        ) : (
          <TouchableOpacity style={detail.rsvpBtn} onPress={handleRSVP} activeOpacity={0.8}>
            <Text style={detail.rsvpTxt}>RSVP for this event</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({
  event, onPress,
}: { event: CleanupEvent; onPress: () => void }) {
  const past = isPast(event.date);

  function handleRSVP() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    WebBrowser.openBrowserAsync(event.url);
  }

  return (
    <Pressable
      style={({ pressed }) => [card.wrap, past && card.dimmed, pressed && card.pressed]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      {/* Top row: org badge + date chip */}
      <View style={card.topRow}>
        <OrgBadge org={event.organization} />
        <View style={card.dateChip}>
          <Text style={card.dateTxt}>{formatDate(event.date)}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={card.title} numberOfLines={2}>{event.title}</Text>

      {/* Location */}
      <View style={card.metaRow}>
        <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
        <Text style={card.metaTxt} numberOfLines={1}>{event.location}</Text>
      </View>

      {/* Time */}
      <View style={card.metaRow}>
        <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
        <Text style={card.metaTxt}>{event.time}</Text>
      </View>

      {/* Description */}
      <Text style={card.desc} numberOfLines={2}>{event.description}</Text>

      {/* Footer */}
      <View style={card.footer}>
        {past ? (
          <View style={card.pastBadge}>
            <Text style={card.pastTxt}>Past Event</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={card.rsvpBtn}
            onPress={(e) => { e.stopPropagation?.(); handleRSVP(); }}
            activeOpacity={0.75}
          >
            <Text style={card.rsvpTxt}>RSVP</Text>
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function EventsScreen({ onClose }: { onClose?: () => void } = {}) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter]         = useState<Filter>('all');
  const [selected, setSelected]     = useState<CleanupEvent | null>(null);

  const filtered = EVENTS.filter((e) => {
    if (filter === 'beach') return BEACH_CATS.includes(e.category);
    if (filter === 'waste') return e.category === 'waste_collection';
    return true;
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Title row — close button when rendered as modal */}
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Events</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => { Haptics.selectionAsync(); setFilter(f.key); }}
              >
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.count}>
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </Text>

        <View style={styles.list}>
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => setSelected(event)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        <SafeAreaView style={detail.safeArea}>
          {selected && (
            <EventDetail event={selected} onClose={() => setSelected(null)} />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ── Detail styles ─────────────────────────────────────────────────────────────
const detail = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  root:     { flex: 1, backgroundColor: Colors.bg },
  handle: {
    width:           36,
    height:          4,
    borderRadius:    2,
    backgroundColor: Colors.border,
    alignSelf:       'center',
    marginTop:       S.sm,
    marginBottom:    S.md,
  },
  scroll: { paddingHorizontal: S.base, paddingBottom: 32 },

  topRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   S.sm,
  },
  closeBtn: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: Colors.surface,
    justifyContent:  'center',
    alignItems:      'center',
  },

  catRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
    marginBottom:  S.sm,
  },
  catTxt: {
    fontFamily:    'InterVariable',
    fontWeight:    '510' as any,
    fontSize:      13,
    color:         Colors.greenDark,
    letterSpacing: 0.1,
  },

  title: {
    fontFamily:    'InterVariable',
    fontWeight:    '700' as any,
    fontSize:      24,
    color:         Colors.textPrimary,
    letterSpacing: -0.4,
    lineHeight:    31,
    marginBottom:  S.lg,
  },

  dateBlock: {
    backgroundColor: Colors.greenTint,
    borderRadius:    14,
    padding:         16,
    gap:             10,
    marginBottom:    S.lg,
  },
  dateBlockRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  dateBlockTxt: {
    fontFamily:    'InterVariable',
    fontWeight:    '510' as any,
    fontSize:      15,
    color:         Colors.greenDark,
  },

  section:      { gap: 8, marginBottom: S.base },
  sectionLabel: {
    fontFamily:    'InterVariable',
    fontWeight:    '590' as any,
    fontSize:      13,
    color:         Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },

  locRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           6,
  },
  locTxt: {
    fontFamily: 'InterVariable',
    fontSize:   15,
    color:      Colors.textPrimary,
    lineHeight: 22,
    flex:       1,
  },

  divider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical:  S.base,
  },

  desc: {
    fontFamily: 'InterVariable',
    fontSize:   15,
    color:      Colors.textPrimary,
    lineHeight: 23,
  },

  sourceRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  sourceTxt: {
    fontFamily: 'InterVariable',
    fontSize:   12,
    color:      Colors.textSecondary,
    flex:       1,
  },

  footer: {
    position:         'absolute',
    bottom:           0,
    left:             0,
    right:            0,
    padding:          S.base,
    paddingBottom:    S.xl,
    backgroundColor:  Colors.bg,
    borderTopWidth:   StyleSheet.hairlineWidth,
    borderTopColor:   Colors.border,
  },
  rsvpBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    backgroundColor: Colors.greenDark,
    borderRadius:    14,
    height:          52,
  },
  rsvpTxt: {
    fontFamily: 'InterVariable',
    fontWeight: '590' as any,
    fontSize:   17,
    color:      '#fff',
  },
  pastBox: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    backgroundColor: Colors.surface,
    borderRadius:    14,
    height:          52,
  },
  pastTxt: {
    fontFamily: 'InterVariable',
    fontSize:   15,
    color:      Colors.textSecondary,
  },
});

// ── Card styles ───────────────────────────────────────────────────────────────
const card = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.bg,
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     Colors.border,
    padding:         16,
    gap:             8,
  },
  dimmed:  { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  topRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  dateChip: {
    backgroundColor: Colors.surface,
    borderRadius:    6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  dateTxt: {
    fontFamily:    'JetBrainsMono-Bold',
    fontSize:      12,
    color:         Colors.textPrimary,
    letterSpacing: 0.4,
  },
  title: {
    fontFamily:    'InterVariable',
    fontWeight:    '590' as any,
    fontSize:      17,
    color:         Colors.textPrimary,
    letterSpacing: -0.2,
    lineHeight:    23,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  metaTxt: {
    fontFamily: 'InterVariable',
    fontSize:   13,
    color:      Colors.textSecondary,
    flex:       1,
  },
  desc: {
    fontFamily: 'InterVariable',
    fontSize:   13,
    color:      Colors.textSecondary,
    lineHeight: 19,
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'flex-end',
    marginTop:      2,
  },
  rsvpBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    backgroundColor: Colors.greenDark,
    borderRadius:    10,
    paddingHorizontal: 16,
    height:          36,
  },
  rsvpTxt: {
    fontFamily: 'InterVariable',
    fontWeight: '590' as any,
    fontSize:   14,
    color:      '#fff',
  },
  pastBadge: {
    backgroundColor: Colors.surface,
    borderRadius:    8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pastTxt: {
    fontFamily: 'InterVariable',
    fontSize:   13,
    color:      Colors.textSecondary,
  },
});

// ── Badge styles ──────────────────────────────────────────────────────────────
const badge = StyleSheet.create({
  pill: {
    borderRadius:    6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  txt: {
    fontFamily:    'InterVariable',
    fontWeight:    '510' as any,
    fontSize:      11,
    letterSpacing: 0.1,
  },
});

// ── Screen styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: S.base, paddingBottom: 60 },

  titleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      S.xl,
    marginBottom:   S.lg,
  },
  pageTitle: {
    fontFamily:    'InterVariable',
    fontWeight:    '510' as any,
    fontSize:      32,
    letterSpacing: -0.5,
    color:         Colors.textPrimary,
  },
  closeBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: Colors.surface,
    justifyContent:  'center',
    alignItems:      'center',
  },

  chips: {
    flexDirection: 'row',
    gap:           S.sm,
    paddingBottom: S.md,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius:    9999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: Colors.greenDark },
  chipTxt: {
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
    fontSize:   13,
    color:      Colors.textSecondary,
  },
  chipTxtActive: { color: '#fff' },

  count: {
    fontFamily:   'InterVariable',
    fontSize:     13,
    color:        Colors.textSecondary,
    marginBottom: S.sm,
  },

  list: { gap: S.sm },
});
