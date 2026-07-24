import { useLocalSearchParams } from 'expo-router';
import { AlbumScreen } from '@/features/album/screens/AlbumScreen';

export default function AlbumPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AlbumScreen albumId={id} />;
}
