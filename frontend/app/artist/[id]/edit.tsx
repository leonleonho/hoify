import { useLocalSearchParams } from 'expo-router';
import { ArtistEditScreen } from '@/features/artist/screens/ArtistEditScreen';

export default function ArtistEditPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ArtistEditScreen artistId={id} />;
}
