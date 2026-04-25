import { View, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import MapboxGL from '@rnmapbox/maps';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { GarbagePin } from '../../components/GarbagePin';
import { TaskCard } from '../../components/TaskCard';

const SNAP_POINTS = ['15%', '50%', '90%'];
// UCLA / LA Hacks venue — update to actual venue coords before demo
const INITIAL_COORDS: [number, number] = [-118.4452, 34.0708];

export default function MapScreen() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('reports')
      .select('*')
      .in('status', ['open', 'claimed', 'pending_verification'])
      .then(({ data }) => setReports(data ?? []));

    const channel = supabase
      .channel('map-reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => {
          setReports((prev) => {
            if (payload.eventType === 'INSERT') return [...prev, payload.new];
            if (payload.eventType === 'UPDATE')
              return prev.map((r) => (r.id === payload.new.id ? payload.new : r));
            if (payload.eventType === 'DELETE')
              return prev.filter((r) => r.id !== payload.old.id);
            return prev;
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 100 },
        (pos) => {
          api.post('/users/location', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }).catch(() => {});
        },
      );
    })();
    return () => { watcher?.remove(); };
  }, []);

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
        {reports.map((r) => <GarbagePin key={r.id} report={r} />)}
      </MapboxGL.MapView>

      <BottomSheet
        snapPoints={SNAP_POINTS}
        index={0}
        backgroundStyle={{ backgroundColor: '#FFFFFF' }}
      >
        <BottomSheetFlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskCard report={item} />}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },
});
