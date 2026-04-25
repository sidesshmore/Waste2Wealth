import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

export default function GalleryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gallery</Text>
      <Text style={styles.sub}>Coming in Phase 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  title:     { fontSize: 24, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textPrimary },
  sub:       { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});
