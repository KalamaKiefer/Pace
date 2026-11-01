import { House } from 'lucide-react-native';

import { PlaceholderScreen } from '@/ui/components/PlaceholderScreen';

export default function HomeScreen() {
  return (
    <PlaceholderScreen
      title="Home"
      message="Your trend, pace and today's rings will live here."
      icon={House}
      accent="accentWeight"
    />
  );
}
