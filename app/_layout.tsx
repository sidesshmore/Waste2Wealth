import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import MapboxGL from '@rnmapbox/maps';
import { useAppFonts } from '../constants/typography';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const EAS_PROJECT_ID = '4f1a9287-ce37-469e-b2cf-d1520189bd60';

async function registerPushToken() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const token = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
    await api.post('/users/push-token', { token: token.data });
  } catch {
    // Push registration is non-critical — never block auth flow
  }
}

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN!);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [loaded] = useAppFonts();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as any;
      if (data?.report_id) router.push(`/cleanup/${data.report_id}`);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!loaded) return;

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
        registerPushToken();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/onboarding');
    });
    return () => listener.subscription.unsubscribe();
  }, [loaded]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
