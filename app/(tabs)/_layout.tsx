import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { S } from '../../constants/spacing';
import { supabase } from '../../lib/supabase';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Regular tab icon — pill background when active
function TabIcon({
  name, focusedName, focused, color, size,
}: {
  name: IoniconName; focusedName: IoniconName;
  focused: boolean; color: string; size: number;
}) {
  return (
    <View style={[styles.pill, focused && styles.pillActive]}>
      <Ionicons
        name={focused ? focusedName : name}
        size={20}
        color={focused ? Colors.greenDark : Colors.textSecondary}
      />
    </View>
  );
}

// Report tab — filled green pill, always stands out
function ReportIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.reportPill, focused && styles.reportPillActive]}>
      <Ionicons name="camera" size={20} color={focused ? '#fff' : Colors.greenDark} />
    </View>
  );
}

export default function TabLayout() {
  const [pendingCount, setPendingCount] = useState(0);
  const insets = useSafeAreaInsets();
  const channelId = useRef(`verify-badge-${Date.now()}`).current;

  useEffect(() => {
    const refresh = async () => {
      const { count } = await supabase
        .from('cleanups')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_verification');
      setPendingCount(count ?? 0);
    };
    refresh();
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleanups' }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   Colors.greenDark,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle:      [styles.tabBar, { height: 60 + insets.bottom, paddingBottom: insets.bottom }],
        tabBarLabelStyle: styles.label,
        tabBarItemStyle:  styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: (p) => <TabIcon name="map-outline" focusedName="map" {...p} />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarIcon: (p) => <TabIcon name="grid-outline" focusedName="grid" {...p} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ focused }) => <ReportIcon focused={focused} />,
          tabBarActiveTintColor:   Colors.greenDark,
          tabBarInactiveTintColor: Colors.greenDark,
        }}
      />
      <Tabs.Screen
        name="verify"
        options={{
          title: 'Verify',
          tabBarBadge: pendingCount || undefined,
          tabBarIcon: (p) => (
            <TabIcon name="shield-checkmark-outline" focusedName="shield-checkmark" {...p} />
          ),
        }}
      />
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: (p) => <TabIcon name="wallet-outline" focusedName="wallet" {...p} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderTopColor:  Colors.border,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -1 },
    shadowOpacity:   0.04,
    shadowRadius:    4,
    elevation:       8,
  },
  item: {
    paddingTop: 6,
  },
  label: {
    fontFamily: 'InterVariable',
    fontSize:   10,
    fontWeight: '510' as any,
    marginTop:  2,
  },

  // Standard tabs — pill lights up on focus
  pill: {
    width:          40,
    height:         28,
    borderRadius:   14,
    justifyContent: 'center',
    alignItems:     'center',
  },
  pillActive: {
    backgroundColor: Colors.greenTint,
  },

  // Report tab — always has a border so it reads as primary action
  reportPill: {
    width:           44,
    height:          32,
    borderRadius:    16,
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     Colors.greenDark,
    backgroundColor: 'transparent',
  },
  reportPillActive: {
    backgroundColor: Colors.greenDark,
    borderColor:     Colors.greenDark,
  },
});
