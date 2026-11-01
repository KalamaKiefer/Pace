import type { ExpoConfig } from 'expo/config';

const BACKGROUND = '#0A0E1A'; // bg-base

const config: ExpoConfig = {
  name: 'Pace',
  slug: 'pace',
  scheme: 'pace',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: BACKGROUND,
  ios: {
    bundleIdentifier: 'com.kalamakiefer.pace',
    supportsTablet: false,
  },
  android: {
    package: 'com.kalamakiefer.pace',
    adaptiveIcon: {
      backgroundColor: BACKGROUND,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        backgroundColor: BACKGROUND,
      },
    ],
    'expo-build-properties',
    '@sentry/react-native',
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
