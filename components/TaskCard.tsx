import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Colors } from '../constants/colors';
import { S } from '../constants/spacing';
import { buildThumb } from '../lib/cloudinary';

const SEVERITY_COLOR: Record<string, string> = {
  Minor:    Colors.greenMid,
  Moderate: Colors.mapAmber,
  Major:    Colors.mapRed,
};

type Props = { report: any };

export function TaskCard({ report }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/cleanup/${report.id}`)}
      activeOpacity={0.8}
    >
      {report.photo_public_id && (
        <Image
          source={buildThumb(report.photo_public_id)}
          style={styles.thumb}
          contentFit="cover"
        />
      )}
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={[styles.badge, { color: SEVERITY_COLOR[report.severity] ?? Colors.textSecondary }]}>
            {report.severity ?? 'Unknown'}
          </Text>
          <Text style={styles.status}>{report.status}</Text>
        </View>
        {report.description && (
          <Text style={styles.desc} numberOfLines={2}>{report.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:   { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginHorizontal: S.base, marginBottom: S.sm, overflow: 'hidden' },
  thumb:  { width: 72, height: 72 },
  info:   { flex: 1, padding: S.sm, gap: 4 },
  row:    { flexDirection: 'row', justifyContent: 'space-between' },
  badge:  { fontSize: 12, fontFamily: 'InterVariable', fontWeight: '510' as any },
  status: { fontSize: 11, color: Colors.textSecondary, fontFamily: 'InterVariable' },
  desc:   { fontSize: 13, color: Colors.textPrimary, fontFamily: 'InterVariable' },
});
