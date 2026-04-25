import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

export default function VerifyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify</Text>
      <Text style={styles.sub}>World ID gate + swipe cards — Phase 3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  title:     { fontSize: 24, fontFamily: 'InterVariable', fontWeight: '510' as any, color: Colors.textPrimary },
  sub:       { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});
