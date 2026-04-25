import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function CleanupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cleanup Detail</Text>
      <Text style={styles.sub}>{id}</Text>
      <Text style={styles.sub}>Comparison slider + AI Vision — Phase 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title:     { fontSize: 24, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textPrimary },
  sub:       { fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
});
