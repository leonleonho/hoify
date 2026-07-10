import { useLocalSearchParams } from 'expo-router';
import { PlaylistScreen } from '@/features/playlist/screens/PlaylistScreen';

export default function PlaylistPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlaylistScreen playlistId={id} />;
}
