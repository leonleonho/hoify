export interface DiscogsResult {
  id: number;
  type: 'artist' | 'master' | 'release' | 'label';
  title: string;
  year?: number;
  thumb: string;
  coverImage?: string;
  format?: string[];
  genre?: string[];
  style?: string[];
  uri: string;
}
