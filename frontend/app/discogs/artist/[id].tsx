import { useLocalSearchParams } from 'expo-router';
import { DiscogsArtistScreen } from '@/features/search/components/DiscogsArtistScreen';

export default function DiscogsArtistPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DiscogsArtistScreen artistId={id} />;
}
