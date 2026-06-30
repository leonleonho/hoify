import { useLocalSearchParams } from 'expo-router';
import { DiscogsAlbumScreen } from '@/features/search/components/DiscogsAlbumScreen';
import type { DiscogsDetailType } from '@/features/search/discogs/detail-types';

export default function DiscogsAlbumPage() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  return (
    <DiscogsAlbumScreen
      albumId={id}
      type={(type as DiscogsDetailType) ?? 'release'}
    />
  );
}
