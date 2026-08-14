import { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';

SplashScreen.preventAutoHideAsync();

function AppNavigator() {
  const { colors, isDark } = useTheme();
  const { socialCallback } = useAuth();

  // Handle OAuth deep-link callback: expenn://auth/callback?t=TOKEN&exp=EXPIRES&u=USER_JSON
  const handleDeepLink = useCallback(
    async ({ url }: { url: string }) => {
      try {
        const parsed = Linking.parse(url);
        if (parsed.path !== 'auth/callback') return;

        const token = parsed.queryParams?.t as string | undefined;
        const exp = parsed.queryParams?.exp as string | undefined;
        const userRaw = parsed.queryParams?.u as string | undefined;

        if (!token || !userRaw) return;

        const user = JSON.parse(userRaw);
        await socialCallback(token, exp ? Number(exp) : 0, user);
        router.replace('/(tabs)');
      } catch {
        router.replace('/login?error=oauth-failed');
      }
    },
    [socialCallback],
  );

  useEffect(() => {
    // Handle URL that launched the app (cold start from deep link)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Handle URL when app is already open (warm start)
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [handleDeepLink]);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="document/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="trips/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
