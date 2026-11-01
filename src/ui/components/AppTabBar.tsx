import type { ComponentProps } from 'react';
import * as Haptics from 'expo-haptics';
import { router, type Tabs } from 'expo-router';
import { Dumbbell, Footprints, House, Plus, Utensils, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Home', icon: House },
  'food/index': { label: 'Food', icon: Utensils },
  'train/index': { label: 'Train', icon: Dumbbell },
  'steps/index': { label: 'Steps', icon: Footprints },
};

const TAB_HEIGHT = 56;
const QUICK_LOG_SIZE = 64;
const QUICK_LOG_RAISE = 12;

export function AppTabBar({ state, navigation }: TabBarProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();

  const renderTab = (index: number) => {
    const route = state.routes[index];
    const tab = TABS[route.name];
    if (!tab) return null;
    const focused = state.index === index;
    const color = focused ? theme.colors.textPrimary : theme.colors.textTertiary;
    const Icon = tab.icon;

    return (
      <Pressable
        key={route.key}
        style={styles.tab}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            Haptics.selectionAsync();
            navigation.navigate(route.name);
          }
        }}
      >
        <Icon size={24} strokeWidth={1.75} color={color} fill={focused ? color : 'transparent'} />
        <Text style={[styles.label, { color }]}>{tab.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {renderTab(0)}
      {renderTab(1)}
      <View style={styles.quickLogSlot}>
        <Pressable
          style={styles.quickLog}
          accessibilityRole="button"
          accessibilityLabel="Quick log"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/quick-log');
          }}
        >
          <Plus size={28} strokeWidth={2} color={theme.colors.textOnAccent} />
        </Pressable>
      </View>
      {renderTab(2)}
      {renderTab(3)}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  tab: {
    flex: 1,
    height: TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space['0.5'],
  },
  label: {
    ...theme.type.micro,
  },
  quickLogSlot: {
    flex: 1,
    height: TAB_HEIGHT,
    alignItems: 'center',
  },
  quickLog: {
    width: QUICK_LOG_SIZE,
    height: QUICK_LOG_SIZE,
    marginTop: -QUICK_LOG_RAISE,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentWeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
