import { useLocalSearchParams } from 'expo-router';
import { ArtistScreen } from '@/features/artist/screens/ArtistScreen';

export default function ArtistPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ArtistScreen artistId={id} />;
}
