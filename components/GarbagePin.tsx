import { View, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Colors } from '../constants/colors';

const STATUS_COLOR: Record<string, string> = {
  open:                 Colors.mapRed,
  claimed:              Colors.mapAmber,
  pending_verification: Colors.greenMid,
  verified:             Colors.greenDark,
};

type Props = { report: any };

export function GarbagePin({ report }: Props) {
  const coords = report.location
    ? [report.location.lng ?? report.location.longitude, report.location.lat ?? report.location.latitude]
    : null;

  if (!coords) return null;

  const color = STATUS_COLOR[report.status] ?? Colors.mapRed;

  return (
    <MapboxGL.PointAnnotation id={report.id} coordinate={coords as [number, number]}>
      <View style={[styles.pin, { backgroundColor: color }]} />
    </MapboxGL.PointAnnotation>
  );
}

const styles = StyleSheet.create({
  pin: {
    width:  16,
    height: 16,
    borderRadius: 8,
    borderWidth:  2,
    borderColor:  '#FFFFFF',
  },
});
