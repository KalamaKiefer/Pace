import { StyleSheet } from 'react-native-unistyles';

import { night, type AppTheme } from './tokens';

declare module 'react-native-unistyles' {
  export interface UnistylesThemes {
    night: AppTheme;
  }
}

StyleSheet.configure({
  themes: { night },
  settings: { initialTheme: 'night' },
});
