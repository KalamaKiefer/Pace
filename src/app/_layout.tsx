import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useUnistyles } from 'react-native-unistyles';

import { openUserDatabase } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { initErrorReporting } from '@/services/errors';

initErrorReporting();

// Replaced by the signed-in user's database in M2.
const db = openUserDatabase('local');

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { theme } = useUnistyles();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const migration = useMigrations(db, migrations);
  if (migration.error) throw migration.error;
  const ready = (fontsLoaded || fontError !== null) && migration.success;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bgBase },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="quick-log"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.5, 0.9],
            sheetGrabberVisible: true,
            sheetCornerRadius: theme.radius.xl,
            contentStyle: { backgroundColor: theme.colors.bgSurface },
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
