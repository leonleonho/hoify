import { useLocalSearchParams } from 'expo-router';
import { DownloadsScreen } from '@/features/downloads/screens/DownloadsScreen';

export default function DownloadsPage() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const initialQuery = typeof q === 'string' ? q : Array.isArray(q) ? q[0] : '';
  return <DownloadsScreen initialQuery={initialQuery ?? ''} />;
}
