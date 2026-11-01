import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export default function QuickLogSheet() {
  return (
    <View style={styles.sheet}>
      <Text style={styles.title} accessibilityRole="header">
        Quick log
      </Text>
      <Text style={styles.message}>Weigh-ins, food, workouts and cardio will start from here.</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  sheet: {
    flex: 1,
    paddingHorizontal: theme.space[5],
    paddingTop: theme.space[8],
    gap: theme.space[2],
  },
  title: {
    ...theme.type.titleM,
    color: theme.colors.textPrimary,
  },
  message: {
    ...theme.type.bodyM,
    color: theme.colors.textSecondary,
  },
}));
