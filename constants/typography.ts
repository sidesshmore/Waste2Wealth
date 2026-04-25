import { useFonts } from 'expo-font';

export const useAppFonts = () =>
  useFonts({
    InterVariable: require('../assets/fonts/InterVariable.ttf'),
    'JetBrainsMono-Bold': require('../assets/fonts/JetBrainsMono-Bold.ttf'),
  });

export const interStyle = (weight: 400 | 510 | 590) => ({
  fontFamily: 'InterVariable',
  fontVariant: [{ 'font-feature-settings': '"cv01", "ss03"' } as any],
  fontWeight: String(weight) as any,
});
