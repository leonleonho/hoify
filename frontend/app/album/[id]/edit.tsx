import { useLocalSearchParams } from 'expo-router';
import { AlbumEditScreen } from '@/features/album/screens/AlbumEditScreen';

export default function AlbumEditPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AlbumEditScreen albumId={id} />;
}
