import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReviewScreen } from '../../components/ReviewScreen';
import { Colors } from '../../constants/colors';
import { S } from '../../constants/spacing';

export default function ReportScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [gpsReady, setGpsReady] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const gpsReadyRef = useRef(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (!gpsReadyRef.current) {
            gpsReadyRef.current = true;
            setGpsReady(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        },
      );
    })();
    return () => { watcher?.remove(); };
  }, []);

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access is needed to report garbage.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedUri && coords) {
    return (
      <ReviewScreen
        uri={capturedUri}
        coords={coords}
        onCancel={() => setCapturedUri(null)}
      />
    );
  }

  const handleShutter = async () => {
    if (!gpsReady) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.85,
      skipProcessing: true,
    });
    if (photo?.uri) setCapturedUri(photo.uri);
  };

  return (
    <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + S.sm }]}>
        <Text style={styles.topBarTitle}>Report Garbage</Text>
      </View>

      {/* GPS lock pill */}
      <View style={styles.gpsPill}>
        <View style={[styles.gpsDot, { backgroundColor: gpsReady ? Colors.greenMid : Colors.mapAmber }]} />
        <Text style={styles.gpsText}>{gpsReady ? 'GPS locked' : 'Acquiring GPS…'}</Text>
        {!gpsReady && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 4 }} />}
      </View>

      {/* Shutter button */}
      <View style={[styles.shutterRow, { paddingBottom: insets.bottom + S.xl }]}>
        <TouchableOpacity
          style={[styles.shutter, !gpsReady && styles.shutterDisabled]}
          onPress={handleShutter}
          disabled={!gpsReady}
          activeOpacity={0.8}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>
    </CameraView>
  );
}

const styles = StyleSheet.create({
  center:          { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: S.xl },
  permText:        { fontSize: 16, fontFamily: 'InterVariable', color: Colors.textPrimary, textAlign: 'center', marginBottom: S.base },
  permBtn:         { backgroundColor: Colors.greenDark, borderRadius: 8, height: 56, paddingHorizontal: 32, justifyContent: 'center' },
  permBtnText:     { color: '#fff', fontSize: 16, fontFamily: 'InterVariable', fontWeight: '510' as any },

  topBar:          { paddingHorizontal: S.base, alignItems: 'center' },
  topBarTitle:     { color: '#fff', fontSize: 17, fontFamily: 'InterVariable', fontWeight: '510' as any },

  gpsPill:         {
    position: 'absolute', top: 96, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 9999,
    paddingHorizontal: 14, paddingVertical: 7, gap: 6,
  },
  gpsDot:          { width: 8, height: 8, borderRadius: 4 },
  gpsText:         { color: '#fff', fontSize: 13, fontFamily: 'InterVariable' },

  shutterRow:      { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  shutter:         {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
  },
  shutterDisabled: { opacity: 0.45 },
  shutterInner:    {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#fff',
    borderWidth: 2, borderColor: Colors.greenDark,
  },
});
