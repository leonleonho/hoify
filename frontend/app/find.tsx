import { useLocalSearchParams } from 'expo-router';
import { FindMusicScreen } from '@/features/downloads/screens/FindMusicScreen';

export default function FindMusicPage() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const initialQuery = typeof q === 'string' ? q : Array.isArray(q) ? q[0] : '';
  return <FindMusicScreen initialQuery={initialQuery ?? ''} />;
}
