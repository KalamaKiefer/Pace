import { Utensils } from 'lucide-react-native';

import { PlaceholderScreen } from '@/ui/components/PlaceholderScreen';

export default function FoodScreen() {
  return (
    <PlaceholderScreen
      title="Food"
      message="Your diary, calorie ring and macros will live here."
      icon={Utensils}
      accent="accentFood"
    />
  );
}
