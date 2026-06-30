export interface DiscogsImage {
  uri: string;
  height: number;
  width: number;
  type: 'primary' | 'secondary';
}

export interface DiscogsArtistMember {
  id: number;
  name: string;
  active: boolean;
  thumbnail_url: string;
}

export interface DiscogsArtistDetail {
  id: number;
  name: string;
  profile?: string;
  images?: DiscogsImage[];
  members?: DiscogsArtistMember[];
  urls?: string[];
  namevariations?: string[];
}

export interface DiscogsTrack {
  position: string;
  title: string;
  duration: string;
  artists?: { name: string; anv?: string; join?: string; role?: string }[];
}

export interface DiscogsReleaseDetail {
  id: number;
  title: string;
  year?: number;
  artists: { id: number; name: string; anv?: string; join?: string; role?: string }[];
  tracklist: DiscogsTrack[];
  styles?: string[];
  genres?: string[];
  images?: DiscogsImage[];
  formats?: { name: string; qty: string; descriptions?: string[] }[];
  labels?: { name: string; catno?: string }[];
  uri: string;
}

export type DiscogsDetailType = 'master' | 'release';

export interface DiscogsArtistRelease {
  id: number;
  type: 'master' | 'release';
  title: string;
  year?: number;
  role: string;
  artist: string;
  thumb: string;
  format?: string;
  status?: string;
  trackinfo?: string;
  stats?: {
    community: { in_collection: number; in_wantlist: number };
    user?: { in_collection: number; in_wantlist: number };
  };
}

export interface DiscogsArtistReleasesResponse {
  pagination: { items: number; page: number; pages: number };
  releases: DiscogsArtistRelease[];
}
