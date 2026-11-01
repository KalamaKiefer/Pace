import { Footprints } from 'lucide-react-native';

import { PlaceholderScreen } from '@/ui/components/PlaceholderScreen';

export default function StepsScreen() {
  return (
    <PlaceholderScreen
      title="Steps"
      message="Your step ring, daily pace and extra burn will live here."
      icon={Footprints}
      accent="accentSteps"
    />
  );
}
