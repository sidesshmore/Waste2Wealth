import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Colors } from '../constants/colors';
import { S } from '../constants/spacing';

const SCREEN_W = Dimensions.get('window').width;
const IMG_W    = SCREEN_W - S.base * 2;
const IMG_H    = IMG_W * 0.72;        // ~4:3 minus a touch

const SEV_COLOR: Record<string, string> = {
  Minor:    Colors.greenMid,
  Moderate: Colors.mapAmber,
  Major:    Colors.mapRed,
};

type Props = {
  report: any;
  onClose: () => void;
  mode?: 'sheet' | 'modal';
};

function Body({ report, onClose }: { report: any; onClose: () => void }) {
  const materials: string[]  = Array.isArray(report.materials)      ? report.materials      : [];
  const conditions: string[] = Array.isArray(report.item_condition) ? report.item_condition : [];

  const userTag = report.user_id
    ? `User #${(report.user_id as string).slice(-5).toUpperCase()}`
    : 'Anonymous';

  const timeStr = report.created_at
    ? new Date(report.created_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  const lat = typeof report.lat === 'number' ? report.lat : null;
  const lng = typeof report.lng === 'number' ? report.lng : null;
  const coordStr = lat != null && lng != null
    ? `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`
    : null;

  const sevColor = SEV_COLOR[report.severity] ?? Colors.greenMid;
  const itemCount = report.item_count ?? 1;

  return (
    <View style={styles.root}>
      {/* ── Photo ──────────────────────────────────────────────────── */}
      <View style={styles.imgWrap}>
        {report.photo_url
          ? <Image source={report.photo_url} style={styles.img} contentFit="cover" />
          : <View style={[styles.img, { backgroundColor: Colors.border }]} />}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={14}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Status line  ● Moderate · 6 items · food ─────────────── */}
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: sevColor }]} />
        <Text style={[styles.statusSev, { color: sevColor }]}>{report.severity ?? 'Unknown'}</Text>
        {itemCount > 0 && <>
          <Text style={styles.bull}>·</Text>
          <Text style={styles.statusMeta}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
        </>}
        {report.litter_category && <>
          <Text style={styles.bull}>·</Text>
          <Text style={styles.statusMeta}>{report.litter_category}</Text>
        </>}
      </View>

      {/* ── Title ─────────────────────────────────────────────────── */}
      <Text style={styles.title}>{report.object_type ?? 'Litter Report'}</Text>
      {report.litter_type
        ? <Text style={styles.subType}>{report.litter_type}</Text>
        : null}

      <View style={styles.divider} />

      {/* ── Description ───────────────────────────────────────────── */}
      {report.description ? (
        <>
          <Text style={styles.desc}>{report.description}</Text>
          <View style={styles.divider} />
        </>
      ) : null}

      {/* ── Location ──────────────────────────────────────────────── */}
      {(report.address || coordStr) ? (
        <>
          <View style={styles.locRow}>
            <Text style={styles.locIcon}>📍</Text>
            <View style={styles.locText}>
              {report.address
                ? <Text style={styles.addressTxt} numberOfLines={2}>{report.address}</Text>
                : null}
              {coordStr
                ? <Text style={styles.coordTxt}>{coordStr}</Text>
                : null}
            </View>
          </View>
          <View style={styles.divider} />
        </>
      ) : null}

      {/* ── Brand ─────────────────────────────────────────────────── */}
      {report.brand ? (
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Brand</Text>
          <Text style={styles.kvVal}>{report.brand}</Text>
        </View>
      ) : null}

      {/* ── Materials ─────────────────────────────────────────────── */}
      {materials.length > 0 ? (
        <View style={styles.tagRow}>
          <Text style={styles.kvLabel}>Materials</Text>
          <View style={styles.tagWrap}>
            {materials.map((m) => (
              <View key={m} style={[styles.tag, styles.tagGreen]}>
                <Text style={[styles.tagTxt, styles.tagGreenTxt]}>{m}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ── Condition ─────────────────────────────────────────────── */}
      {conditions.length > 0 ? (
        <View style={styles.tagRow}>
          <Text style={styles.kvLabel}>Condition</Text>
          <View style={styles.tagWrap}>
            {conditions.map((c) => (
              <View key={c} style={[styles.tag, styles.tagAmber]}>
                <Text style={[styles.tagTxt, styles.tagAmberTxt]}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ── Footer ────────────────────────────────────────────────── */}
      <View style={styles.divider} />
      <Text style={styles.footer}>
        {userTag}{timeStr ? `  ·  ${timeStr}` : ''}
      </Text>

      <View style={{ height: S['2xl'] }} />
    </View>
  );
}

export function LitterDetailSheet({ report, onClose, mode = 'sheet' }: Props) {
  if (mode === 'modal') {
    return (
      <ScrollView bounces={false}>
        <Body report={report} onClose={onClose} />
      </ScrollView>
    );
  }
  return (
    <BottomSheetScrollView>
      <Body report={report} onClose={onClose} />
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: S.base,
    paddingTop: S.sm,
  },

  // Photo
  imgWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: S.md,
  },
  img: { width: IMG_W, height: IMG_H },
  closeBtn: {
    position: 'absolute',
    top: S.sm,
    right: S.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeTxt: { color: '#fff', fontSize: 12, lineHeight: 14 },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: S.xs,
  },
  dot:       { width: 7, height: 7, borderRadius: 4 },
  statusSev: { fontSize: 13, fontFamily: 'InterVariable', fontWeight: '600' as any },
  statusMeta:{ fontSize: 13, fontFamily: 'InterVariable', color: Colors.textSecondary },
  bull:      { fontSize: 13, color: Colors.border },

  // Title
  title: {
    fontSize: 21,
    fontFamily: 'InterVariable',
    fontWeight: '700' as any,
    color: Colors.textPrimary,
    lineHeight: 27,
  },
  subType: {
    fontSize: 13,
    fontFamily: 'InterVariable',
    color: Colors.textSecondary,
    marginTop: 2,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: S.base,
  },

  // Description
  desc: {
    fontSize: 14,
    fontFamily: 'InterVariable',
    color: Colors.textPrimary,
    lineHeight: 21,
  },

  // Location
  locRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.sm,
  },
  locIcon: { fontSize: 15, marginTop: 1 },
  locText: { flex: 1 },
  addressTxt: {
    fontSize: 13,
    fontFamily: 'InterVariable',
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  coordTxt: {
    fontSize: 12,
    fontFamily: 'InterVariable',
    color: Colors.textSecondary,
    marginTop: 3,
  },

  // Key-value rows
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: S.xs,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: S.xs,
    gap: S.sm,
  },
  kvLabel: {
    fontSize: 13,
    fontFamily: 'InterVariable',
    color: Colors.textSecondary,
    width: 74,
    flexShrink: 0,
  },
  kvVal: {
    fontSize: 13,
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
    color: Colors.textPrimary,
  },

  // Tags
  tagWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.xs,
  },
  tag: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagTxt: {
    fontSize: 12,
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
  },
  tagGreen:    { backgroundColor: Colors.greenTint },
  tagGreenTxt: { color: Colors.greenDark },
  tagAmber:    { backgroundColor: '#FFF3E0' },
  tagAmberTxt: { color: '#C84B00' },

  // Footer
  footer: {
    fontSize: 12,
    fontFamily: 'InterVariable',
    color: Colors.textSecondary,
  },
});
