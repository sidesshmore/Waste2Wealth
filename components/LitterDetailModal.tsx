import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildHeroImage } from '../lib/cloudinary';
import { Colors } from '../constants/colors';
import { S } from '../constants/spacing';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const SEV_COLOR: Record<string, string> = {
  Minor:    Colors.greenMid,
  Moderate: Colors.mapAmber,
  Major:    Colors.mapRed,
};

const STATUS_LABEL: Record<string, string> = {
  open:                 'Open',
  claimed:              'Claimed',
  pending_verification: 'Pending review',
  verified:             'Verified clean',
};

function Row({ icon, label, value }: { icon: IoniconName; label: string; value: string }) {
  if (!value || value === '—') return null;
  return (
    <View style={r.row}>
      <View style={r.iconWrap}>
        <Ionicons name={icon} size={16} color={Colors.textSecondary} />
      </View>
      <View style={r.rowBody}>
        <Text style={r.rowLabel}>{label}</Text>
        <Text style={r.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={r.chipSection}>
      <Text style={r.chipLabel}>{label}</Text>
      <View style={r.chipWrap}>
        {items.map((item) => (
          <View key={item} style={r.chip}>
            <Text style={r.chipTxt}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function LitterDetailModal({ report, onClose }: { report: any; onClose: () => void }) {
  const insets = useSafeAreaInsets();

  const heroUrl = report.photo_public_id
    ? buildHeroImage(report.photo_public_id)
    : report.photo_url ?? null;

  const label    = report.object_type ?? report.litter_category ?? 'Litter';
  const sev      = report.severity as string | undefined;
  const sevColor = SEV_COLOR[sev ?? ''] ?? Colors.textSecondary;
  const count    = typeof report.item_count === 'number' ? report.item_count : null;

  const materials  = Array.isArray(report.materials)      ? report.materials      : [];
  const conditions = Array.isArray(report.item_condition) ? report.item_condition : [];

  const shortAddr = report.address
    ? report.address.split(',').slice(0, 2).join(',').trim()
    : null;

  const timeStr = report.created_at
    ? new Date(report.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  const userTag = report.user_id
    ? `User #${(report.user_id as string).slice(-5).toUpperCase()}`
    : 'Anonymous';

  const status = report.status as string | undefined;
  const canClaim = status === 'open';

  const handleClean = () => {
    onClose();
    router.push(`/cleanup/${report.id}`);
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>

      {/* ── Scrollable content ──────────────────────────────────────── */}
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>

        {/* Hero image */}
        <View style={styles.heroWrap}>
          {heroUrl ? (
            <Image source={heroUrl} style={styles.hero} contentFit="cover" />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <Ionicons name="image-outline" size={40} color={Colors.border} />
            </View>
          )}

          {/* Scrim + close */}
          <View style={styles.heroScrim} />
          <TouchableOpacity
            style={[styles.closeBtn, { top: insets.top + 12 }]}
            onPress={onClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Severity badge over photo */}
          {sev ? (
            <View style={[styles.sevBadge, { backgroundColor: sevColor }]}>
              <Text style={styles.sevBadgeTxt}>{sev}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Content card ──────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Title + count */}
          <Text style={styles.title}>{label}</Text>
          <View style={styles.subtitleRow}>
            {sev ? (
              <>
                <View style={[styles.dot, { backgroundColor: sevColor }]} />
                <Text style={[styles.sevTxt, { color: sevColor }]}>{sev}</Text>
              </>
            ) : null}
            {count != null && count > 1 ? (
              <Text style={styles.countTxt}>· {count} items</Text>
            ) : null}
            {status ? (
              <View style={styles.statusChip}>
                <Text style={styles.statusTxt}>{STATUS_LABEL[status] ?? status}</Text>
              </View>
            ) : null}
          </View>

          {/* Description */}
          {report.description ? (
            <Text style={styles.desc}>{report.description}</Text>
          ) : null}

          <View style={styles.divider} />

          {/* Metadata rows */}
          {shortAddr ? <Row icon="location-outline"   label="Location"  value={shortAddr} /> : null}
          {report.brand ? <Row icon="pricetag-outline" label="Brand"     value={report.brand} /> : null}
          <Row icon="cube-outline"      label="Object"    value={report.object_type ?? ''} />
          <Row icon="person-outline"    label="Reported by" value={userTag} />
          {timeStr ? <Row icon="calendar-outline"  label="Date"      value={timeStr} /> : null}

          {/* Chips */}
          {(materials.length > 0 || conditions.length > 0) ? (
            <>
              <View style={styles.divider} />
              <ChipRow label="Materials"  items={materials} />
              <ChipRow label="Condition"  items={conditions} />
            </>
          ) : null}

          {/* Bottom padding so content clears the sticky CTA */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* ── Sticky CTA ─────────────────────────────────────────────── */}
      <View style={styles.ctaWrap}>
        {canClaim ? (
          <TouchableOpacity style={styles.ctaBtn} onPress={handleClean} activeOpacity={0.85}>
            <Ionicons name="leaf" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.ctaTxt}>I'll Clean This</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ctaDisabled}>
            <Text style={styles.ctaDisabledTxt}>
              {STATUS_LABEL[status ?? ''] ?? 'Not available'}
            </Text>
          </View>
        )}
      </View>

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.bg,
  },

  // Hero
  heroWrap: {
    position: 'relative',
  },
  hero: {
    width:  '100%',
    height: 300,
    backgroundColor: Colors.surface,
  },
  heroPlaceholder: {
    justifyContent: 'center',
    alignItems:     'center',
  },
  heroScrim: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    height:          90,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  closeBtn: {
    position:        'absolute',
    right:           16,
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent:  'center',
    alignItems:      'center',
  },

  sevBadge: {
    position:         'absolute',
    bottom:           14,
    left:             16,
    borderRadius:     9999,
    paddingHorizontal: 12,
    paddingVertical:  5,
  },
  sevBadgeTxt: {
    fontSize:   12,
    fontFamily: 'InterVariable',
    fontWeight: '600' as any,
    color:      '#fff',
  },

  // Content
  content: {
    paddingHorizontal: S.base,
    paddingTop:        S.base,
  },

  title: {
    fontSize:   22,
    fontFamily: 'InterVariable',
    fontWeight: '700' as any,
    color:      Colors.textPrimary,
    marginBottom: 6,
  },

  subtitleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    marginBottom:   S.sm,
  },
  dot: {
    width:        7,
    height:       7,
    borderRadius: 3.5,
  },
  sevTxt: {
    fontSize:   13,
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
  },
  countTxt: {
    fontSize:   13,
    fontFamily: 'InterVariable',
    color:      Colors.textSecondary,
  },
  statusChip: {
    marginLeft:       4,
    backgroundColor:  Colors.surface,
    borderRadius:     9999,
    paddingHorizontal: 9,
    paddingVertical:  3,
    borderWidth:      StyleSheet.hairlineWidth,
    borderColor:      Colors.border,
  },
  statusTxt: {
    fontSize:   11,
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
    color:      Colors.textSecondary,
  },

  desc: {
    fontSize:     14,
    fontFamily:   'InterVariable',
    color:        Colors.textSecondary,
    lineHeight:   20,
    marginBottom: S.sm,
  },

  divider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical:  S.sm,
  },

  // CTA
  ctaWrap: {
    position:         'absolute',
    bottom:           0,
    left:             0,
    right:            0,
    paddingHorizontal: S.base,
    paddingVertical:  S.sm,
    backgroundColor:  Colors.bg,
    borderTopWidth:   StyleSheet.hairlineWidth,
    borderTopColor:   Colors.border,
  },
  ctaBtn: {
    backgroundColor:  Colors.greenDark,
    borderRadius:     14,
    height:           54,
    flexDirection:    'row',
    justifyContent:   'center',
    alignItems:       'center',
  },
  ctaTxt: {
    fontSize:   17,
    fontFamily: 'InterVariable',
    fontWeight: '600' as any,
    color:      '#fff',
  },
  ctaDisabled: {
    backgroundColor: Colors.surface,
    borderRadius:    14,
    height:          54,
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  ctaDisabledTxt: {
    fontSize:   15,
    fontFamily: 'InterVariable',
    color:      Colors.textSecondary,
  },
});

// ── Row styles ────────────────────────────────────────────────────────────────
const r = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconWrap: {
    width:          32,
    alignItems:     'center',
    paddingTop:     1,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize:     11,
    fontFamily:   'InterVariable',
    fontWeight:   '600' as any,
    color:        Colors.textSecondary,
    textTransform: 'uppercase' as any,
    letterSpacing: 0.5,
    marginBottom:  2,
  },
  rowValue: {
    fontSize:   14,
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
    color:      Colors.textPrimary,
    lineHeight: 19,
  },

  // Chips
  chipSection: {
    marginTop: S.xs,
    marginBottom: S.xs,
  },
  chipLabel: {
    fontSize:     11,
    fontFamily:   'InterVariable',
    fontWeight:   '600' as any,
    color:        Colors.textSecondary,
    textTransform: 'uppercase' as any,
    letterSpacing: 0.5,
    marginBottom:  6,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
  },
  chip: {
    backgroundColor:  Colors.surface,
    borderRadius:     9999,
    paddingHorizontal: 11,
    paddingVertical:  5,
    borderWidth:      StyleSheet.hairlineWidth,
    borderColor:      Colors.border,
  },
  chipTxt: {
    fontSize:   12,
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
    color:      Colors.textPrimary,
  },
});
