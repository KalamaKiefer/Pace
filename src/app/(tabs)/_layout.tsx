import { Tabs } from 'expo-router';

import { AppTabBar } from '@/ui/components/AppTabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="food/index" />
      <Tabs.Screen name="train/index" />
      <Tabs.Screen name="steps/index" />
    </Tabs>
  );
}
