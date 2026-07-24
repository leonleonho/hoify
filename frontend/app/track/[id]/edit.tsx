import { useLocalSearchParams } from 'expo-router';
import { TrackEditScreen } from '@/features/track/screens/TrackEditScreen';

export default function TrackEditPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TrackEditScreen trackId={id} />;
}
