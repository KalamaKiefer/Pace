import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

type Props = {
  title: string;
  message: string;
  icon: LucideIcon;
  accent: 'accentWeight' | 'accentFood' | 'accentTrain' | 'accentSteps';
};

export function PlaceholderScreen({ title, message, icon: Icon, accent }: Props) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + theme.space[4] }]}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card}>
        <Icon size={24} strokeWidth={1.75} color={theme.colors[accent]} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
    paddingHorizontal: theme.space[5],
    gap: theme.space[4],
  },
  title: {
    ...theme.type.titleL,
    color: theme.colors.textPrimary,
  },
  card: {
    backgroundColor: theme.colors.bgSurface,
    borderRadius: theme.radius.lg,
    borderTopWidth: 1,
    borderTopColor: theme.highlightTop,
    padding: theme.space[4],
    gap: theme.space[2],
  },
  message: {
    ...theme.type.bodyM,
    color: theme.colors.textSecondary,
  },
}));
