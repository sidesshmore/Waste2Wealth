import {
  View, Text, TouchableOpacity, Image, ScrollView, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uploadPhoto } from '../lib/cloudinary';
import { api } from '../lib/api';
import { Colors } from '../constants/colors';
import { S } from '../constants/spacing';

type Severity = 'Minor' | 'Moderate' | 'Major';

type Props = {
  uri: string;
  coords: { lat: number; lng: number };
  onCancel: () => void;
};

export function ReviewScreen({ uri, coords, onCancel }: Props) {
  const [uploading, setUploading] = useState(true);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    secure_url: string; public_id: string; tags: string[];
  } | null>(null);
  const [severity, setSeverity] = useState<Severity>('Moderate');
  const [submitting, setSubmitting] = useState(false);
  const hasUploaded = useRef(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (hasUploaded.current) return;
    hasUploaded.current = true;

    uploadPhoto(uri, 'reports')
      .then((result) => {
        setUploadResult(result);
        setUploadDone(true);
        setUploading(false);
      })
      .catch((err) => {
        setUploading(false);
        Alert.alert('Upload failed', err?.message ?? 'Could not upload photo. Please try again.');
      });
  }, []);

  const handleSubmit = async () => {
    if (!uploadResult) return;
    setSubmitting(true);
    try {
      await api.post('/reports/', {
        photo_url:       uploadResult.secure_url,
        photo_public_id: uploadResult.public_id,
        lat:             coords.lat,
        lng:             coords.lng,
        severity,
        tags:            uploadResult.tags,
      });
      onCancel();
      router.replace('/(tabs)/');
    } catch (e: any) {
      Alert.alert('Submit failed', e?.message ?? 'Please try again.');
      setSubmitting(false);
    }
  };

  const SEVERITIES: Severity[] = ['Minor', 'Moderate', 'Major'];
  const SEVERITY_COLOR: Record<Severity, string> = {
    Minor:    Colors.greenMid,
    Moderate: Colors.mapAmber,
    Major:    Colors.mapRed,
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + S.base, paddingBottom: insets.bottom + S.xl }]}
      bounces={false}
    >
      {/* Photo preview */}
      <Image source={{ uri }} style={styles.photo} resizeMode="cover" />

      {/* Cloudinary verification status pill */}
      <View style={[styles.pill, uploadDone ? styles.pillDone : styles.pillPending]}>
        {uploading && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />}
        <Text style={styles.pillText}>
          {uploading ? 'Verifying with Cloudinary AI…' : '✓ Real photo confirmed'}
        </Text>
      </View>

      {/* Severity */}
      <Text style={styles.label}>Severity</Text>
      <View style={styles.severityRow}>
        {SEVERITIES.map((s) => {
          const active = severity === s;
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.chip,
                active && { backgroundColor: SEVERITY_COLOR[s], borderColor: SEVERITY_COLOR[s] },
              ]}
              onPress={() => setSeverity(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, (!uploadDone || submitting) && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={!uploadDone || submitting}
        activeOpacity={0.85}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Submit Report</Text>}
      </TouchableOpacity>

      {/* Cancel */}
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg },
  content:        { paddingHorizontal: S.base },

  photo:          { width: '100%', height: 280, borderRadius: 12, marginBottom: S.base },

  pill:           {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: S.xl,
  },
  pillPending:    { backgroundColor: Colors.textSecondary },
  pillDone:       { backgroundColor: Colors.greenMid },
  pillText:       { color: '#fff', fontSize: 13, fontFamily: 'InterVariable', fontWeight: '510' as any },

  label:          { fontSize: 14, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textPrimary, marginBottom: S.sm },
  severityRow:    { flexDirection: 'row', gap: S.sm, marginBottom: S.xl },
  chip:           {
    flex: 1, height: 40, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  chipText:       { fontSize: 14, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },

  submitBtn:      {
    backgroundColor: Colors.greenDark, borderRadius: 8, height: 56,
    justifyContent: 'center', alignItems: 'center', marginBottom: S.sm,
  },
  btnDisabled:    { opacity: 0.5 },
  submitText:     { color: '#fff', fontSize: 16, fontFamily: 'InterVariable', fontWeight: '510' as any },

  cancelBtn:      { height: 48, justifyContent: 'center', alignItems: 'center' },
  cancelText:     { color: Colors.textSecondary, fontSize: 15, fontFamily: 'InterVariable' },
});
