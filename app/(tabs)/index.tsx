import {
  View, Text, StyleSheet, Modal, Dimensions, TouchableOpacity,
} from 'react-native';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import MapboxGL from '@rnmapbox/maps';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { buildThumb } from '../../lib/cloudinary';
import { LitterDetailModal } from '../../components/LitterDetailModal';
import { Colors } from '../../constants/colors';
import { S } from '../../constants/spacing';

// UCLA / LA Hacks venue
const INITIAL_COORDS: [number, number] = [-118.4452, 34.0708];

const { width: W } = Dimensions.get('window');
const H_PAD   = S.base;
const COL_GAP = S.sm;
const CARD_W  = (W - H_PAD * 2 - COL_GAP) / 2;
const PHOTO_H = CARD_W * 1.1;

const SEV_COLOR: Record<string, string> = {
  Minor: Colors.greenMid, Moderate: Colors.mapAmber, Major: Colors.mapRed,
};

const CLUSTER_CIRCLE_COLOR = [
  'step', ['get', 'point_count'],
  Colors.greenDark, 5,
  Colors.mapAmber,  20,
  Colors.mapRed,
] as any;

const CLUSTER_RADIUS = [
  'step', ['get', 'point_count'],
  20, 5,
  28, 20,
  36,
] as any;

const PIN_COLOR = [
  'match', ['get', 'severity'],
  'Major',    Colors.mapRed,
  'Moderate', Colors.mapAmber,
  Colors.greenDark,
] as any;

const CATEGORY_EMOJI: Record<string, string> = {
  smoking: '🚬', food: '🍟', softDrinks: '🥤',
  alcohol: '🍺', coffee: '☕', brands: '🏷️',
  sanitary: '🧴', other: '🗑️', dumping: '⚠️',
};

// ── 2-col photo card ─────────────────────────────────────────────────────────
function ReportCard({ item, onPress }: { item: any; onPress: () => void }) {
  const src   = item.photo_public_id ? buildThumb(item.photo_public_id) : item.photo_url;
  const label = item.object_type ?? item.litter_category ?? 'Litter';
  const emoji = CATEGORY_EMOJI[item.litter_category] ?? '🗑️';
  const sev   = item.severity as string | undefined;

  return (
    <TouchableOpacity style={card.wrap} onPress={onPress} activeOpacity={0.85}>
      {src ? (
        <Image source={src} style={card.photo} contentFit="cover" />
      ) : (
        <View style={[card.photo, card.photoPlaceholder]}>
          <Text style={{ fontSize: 28 }}>{emoji}</Text>
        </View>
      )}
      {sev ? (
        <View style={[card.sevDot, { backgroundColor: SEV_COLOR[sev] ?? Colors.greenMid }]} />
      ) : null}
      <Text style={card.label} numberOfLines={1}>{label}</Text>
      {sev ? (
        <Text style={[card.sev, { color: SEV_COLOR[sev] ?? Colors.textSecondary }]}>{sev}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrap: { width: CARD_W },
  photo: {
    width:           CARD_W,
    height:          PHOTO_H,
    borderRadius:    10,
    backgroundColor: Colors.surface,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems:     'center',
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
  label: {
    marginTop:  S.xs,
    fontSize:   12,
    fontFamily: 'InterVariable',
    fontWeight: '510' as any,
    color:      Colors.textPrimary,
  },
  sev: {
    fontSize:   11,
    fontFamily: 'InterVariable',
    marginTop:  1,
  },
});

// ── Header ───────────────────────────────────────────────────────────────────
function SheetHeader({ reports }: { reports: any[] }) {
  const counts = reports.reduce<Record<string, number>>(
    (acc, r) => { acc[r.severity] = (acc[r.severity] ?? 0) + 1; return acc; },
    {},
  );
  return (
    <View style={hdr.wrap}>
      <Text style={hdr.title}>
        {reports.length} open report{reports.length !== 1 ? 's' : ''}
      </Text>
      <View style={hdr.pills}>
        {(['Major', 'Moderate', 'Minor'] as const).map((s) =>
          counts[s] ? (
            <View key={s} style={hdr.pill}>
              <View style={[hdr.dot, { backgroundColor: SEV_COLOR[s] }]} />
              <Text style={hdr.pillTxt}>{counts[s]} {s}</Text>
            </View>
          ) : null,
        )}
      </View>
    </View>
  );
}

const hdr = StyleSheet.create({
  wrap:    { paddingHorizontal: H_PAD, paddingTop: S.sm, paddingBottom: S.xs },
  title:   { fontSize: 13, fontFamily: 'InterVariable', fontWeight: '600' as any, color: Colors.textPrimary, marginBottom: S.xs },
  pills:   { flexDirection: 'row', gap: S.sm },
  pill:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:     { width: 6, height: 6, borderRadius: 3 },
  pillTxt: { fontSize: 12, fontFamily: 'InterVariable', color: Colors.textSecondary },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function MapScreen() {
  const [reports, setReports]   = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const mapChannelId = useRef(`map-reports-${Date.now()}`).current;

  // ── Load + subscribe ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('reports')
      .select('*')
      .in('status', ['open', 'claimed', 'pending_verification'])
      .then(({ data }) => setReports(data ?? []));

    const channel = supabase
      .channel(mapChannelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
        setReports((prev) => {
          if (payload.eventType === 'INSERT') return [...prev, payload.new];
          if (payload.eventType === 'UPDATE')
            return prev.map((r) => (r.id === payload.new.id ? payload.new : r));
          if (payload.eventType === 'DELETE')
            return prev.filter((r) => r.id !== payload.old.id);
          return prev;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Location updates ────────────────────────────────────────────────────────
  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 100 },
        (pos) => {
          api.post('/users/location', { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {});
        },
      );
    })();
    return () => { watcher?.remove(); };
  }, []);

  // ── GeoJSON ─────────────────────────────────────────────────────────────────
  const geojson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: reports
      .filter((r) => r.lat != null && r.lng != null)
      .map((r) => ({
        type: 'Feature' as const,
        id: r.id,
        geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] as [number, number] },
        properties: {
          id:              r.id,
          severity:        r.severity ?? 'Minor',
          litter_category: r.litter_category ?? null,
          object_type:     r.object_type ?? null,
        },
      })),
  }), [reports]);

  // ── Pin tap → open detail modal ─────────────────────────────────────────────
  const handlePinPress = useCallback((e: any) => {
    const feature = e?.features?.[0];
    if (!feature || feature.properties?.cluster) return;
    const report = reports.find((r) => r.id === feature.properties?.id);
    if (report) setSelected(report);
  }, [reports]);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/dark-v11"
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          zoomLevel={14}
          centerCoordinate={INITIAL_COORDS}
          animationMode="none"
        />
        <MapboxGL.UserLocation visible />

        <MapboxGL.ShapeSource
          id="reports"
          shape={geojson}
          cluster
          clusterRadius={50}
          clusterMaxZoom={14}
          onPress={handlePinPress}
        >
          <MapboxGL.CircleLayer
            id="clusters"
            filter={['has', 'point_count']}
            style={{
              circleColor:       CLUSTER_CIRCLE_COLOR,
              circleRadius:      CLUSTER_RADIUS,
              circleOpacity:     0.88,
              circleStrokeWidth: 2,
              circleStrokeColor: 'rgba(255,255,255,0.35)',
            }}
          />
          <MapboxGL.SymbolLayer
            id="cluster-count"
            filter={['has', 'point_count']}
            style={{
              textField: ['get', 'point_count_abbreviated'],
              textSize:  13,
              textColor: '#fff',
              textFont:  ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            }}
          />
          <MapboxGL.CircleLayer
            id="unclustered-pins"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleColor:       PIN_COLOR,
              circleRadius:      9,
              circleStrokeWidth: 2,
              circleStrokeColor: '#fff',
            }}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>

      {/* ── Bottom sheet with 2-col grid ─────────────────────────── */}
      <BottomSheet
        ref={sheetRef}
        snapPoints={['12%', '50%', '90%']}
        index={0}
        backgroundStyle={{ backgroundColor: Colors.bg }}
        handleIndicatorStyle={{ backgroundColor: Colors.border }}
      >
        <BottomSheetFlatList
          data={reports}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={grid.row}
          ListHeaderComponent={<SheetHeader reports={reports} />}
          ItemSeparatorComponent={() => <View style={{ height: COL_GAP }} />}
          contentContainerStyle={grid.content}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ReportCard item={item} onPress={() => setSelected(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌿</Text>
              <Text style={styles.emptyTitle}>All clear here</Text>
              <Text style={styles.emptySub}>No open reports near this area.</Text>
            </View>
          }
        />
      </BottomSheet>

      {/* ── Detail modal ─────────────────────────────────────────── */}
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <LitterDetailModal report={selected ?? {}} onClose={() => setSelected(null)} />
      </Modal>
    </View>
  );
}

const grid = StyleSheet.create({
  content: { paddingHorizontal: H_PAD, paddingBottom: S.xl },
  row:     { gap: COL_GAP },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },

  empty: {
    alignItems:        'center',
    paddingTop:        60,
    paddingHorizontal: 40,
  },
  emptyIcon:  { fontSize: 32, marginBottom: S.sm },
  emptyTitle: {
    fontSize:     15,
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
  },
});
