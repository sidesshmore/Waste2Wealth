import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Colors } from '../constants/colors';
import { S } from '../constants/spacing';
import { buildThumb } from '../lib/cloudinary';

const SEV_COLOR: Record<string, string> = {
  Minor:    Colors.greenMid,
  Moderate: Colors.mapAmber,
  Major:    Colors.mapRed,
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  open:                 { bg: Colors.greenTint,  color: Colors.greenDark },
  claimed:              { bg: '#FFF3E0',          color: '#C84B00' },
  pending_verification: { bg: '#E3F2FD',          color: '#1565C0' },
  verified:             { bg: Colors.greenTint,   color: Colors.greenDark },
};

const CATEGORY_EMOJI: Record<string, string> = {
  smoking:    '🚬', food:    '🍟', softDrinks: '🥤',
  alcohol:    '🍺', coffee: '☕',  brands:     '🏷️',
  sanitary:   '🧴', other:  '🗑️', dumping:    '⚠️',
};

export function TaskCard({ report }: { report: any }) {
  const sev      = report.severity as string | undefined;
  const sevColor = SEV_COLOR[sev ?? ''] ?? Colors.textSecondary;

  const label    = report.object_type ?? report.litter_category ?? 'Litter';
  const emoji    = CATEGORY_EMOJI[report.litter_category] ?? '🗑️';
  const count    = report.item_count as number | undefined;

  const shortAddr = report.address
    ? report.address.split(',').slice(0, 2).join(',').trim()
    : null;

  const status      = report.status as string | undefined;
  const statusStyle = STATUS_STYLE[status ?? ''] ?? { bg: Colors.surface, color: Colors.textSecondary };
  const statusLabel = status === 'pending_verification' ? 'pending' : (status ?? 'open');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/cleanup/${report.id}`)}
      activeOpacity={0.78}
    >
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {report.photo_public_id || report.photo_url ? (
          <Image
            source={report.photo_public_id ? buildThumb(report.photo_public_id) : report.photo_url}
            style={styles.thumb}
            contentFit="cover"
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbEmoji}>{emoji}</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.label} numberOfLines={1}>{emoji} {label}</Text>
          <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusTxt, { color: statusStyle.color }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Severity + count */}
        <View style={styles.metaRow}>
          <View style={[styles.dot, { backgroundColor: sevColor }]} />
          <Text style={[styles.sevTxt, { color: sevColor }]}>{sev ?? 'Unknown'}</Text>
          {count != null && count > 1 && (
            <Text style={styles.metaSep}>· {count} items</Text>
          )}
        </View>

        {/* Address */}
        {shortAddr ? (
          <Text style={styles.addr} numberOfLines={1}>📍 {shortAddr}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection:   'row',
    backgroundColor: '#fff',
    borderRadius:    12,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.border,
    marginHorizontal: S.base,
    marginBottom:    S.sm,
    overflow:        'hidden',
  },

  thumbWrap: {
    width:  80,
    height: 80,
  },
  thumb: {
    width:  '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width:           '100%',
    height:          '100%',
    backgroundColor: Colors.surface,
    justifyContent:  'center',
    alignItems:      'center',
  },
  thumbEmoji: { fontSize: 24 },

  body: {
    flex:    1,
    padding: S.sm,
    gap:     3,
    justifyContent: 'center',
  },

  titleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            S.xs,
    marginBottom:   1,
  },
  label: {
    flex:       1,
    fontSize:   13,
    fontFamily: 'InterVariable',
    fontWeight: '600' as any,
    color:      Colors.textPrimary,
  },
  statusChip: {
    borderRadius:    9999,
    paddingHorizontal: 8,
    paddingVertical:  2,
  },
  statusTxt: {
    fontSize:   10,
    fontFamily: 'InterVariable',
    fontWeight: '600' as any,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  sevTxt: {
    fontSize:   12,
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
  },
  metaSep: {
    fontSize:   12,
    fontFamily: 'InterVariable',
    color:      Colors.textSecondary,
  },

  addr: {
    fontSize:   11,
    fontFamily: 'InterVariable',
    color:      Colors.textSecondary,
    marginTop:  1,
  },
});
