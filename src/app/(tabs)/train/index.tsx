import { Dumbbell } from 'lucide-react-native';

import { PlaceholderScreen } from '@/ui/components/PlaceholderScreen';

export default function TrainScreen() {
  return (
    <PlaceholderScreen
      title="Train"
      message="Your weekly goal, workouts and cardio will live here."
      icon={Dumbbell}
      accent="accentTrain"
    />
  );
}
