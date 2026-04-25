import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

export default function TabLayout() {
  const [pendingCount, setPendingCount] = useState(0);

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
      .channel('verify-badge')
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
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor:  Colors.border,
          borderTopWidth:  1,
          height:          56,
        },
        tabBarLabelStyle: {
          fontFamily: 'InterVariable',
          fontSize:   11,
          fontWeight: '510' as any,
        },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Map'     }} />
      <Tabs.Screen name="gallery" options={{ title: 'Gallery' }} />
      <Tabs.Screen name="report"  options={{ title: 'Report'  }} />
      <Tabs.Screen name="verify"  options={{ title: 'Verify', tabBarBadge: pendingCount || undefined }} />
      <Tabs.Screen name="wallet"  options={{ title: 'Wallet'  }} />
    </Tabs>
  );
}
