export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AddTracksToPlaylistInput = {
  playlistId: Scalars['ID']['input'];
  position: Scalars['Int']['input'];
  trackIds: Array<Scalars['ID']['input']>;
};

export type Album = {
  __typename?: 'Album';
  artist: Artist;
  coverUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  releaseYear?: Maybe<Scalars['Int']['output']>;
  title: Scalars['String']['output'];
  tracks: Array<Track>;
  updatedAt: Scalars['String']['output'];
};

export type Artist = {
  __typename?: 'Artist';
  albums: Array<Album>;
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  token: Scalars['String']['output'];
  user: User;
};

export type CreateAlbumInput = {
  artistId: Scalars['ID']['input'];
  coverUrl?: InputMaybe<Scalars['String']['input']>;
  releaseYear?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
};

export type CreateArtistInput = {
  bio?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateGenreInput = {
  name: Scalars['String']['input'];
};

export type CreatePlaylistInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  trackIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateTrackInput = {
  albumId: Scalars['ID']['input'];
  discNumber?: InputMaybe<Scalars['Int']['input']>;
  duration?: InputMaybe<Scalars['Int']['input']>;
  fileFormat?: InputMaybe<Scalars['String']['input']>;
  filePath: Scalars['String']['input'];
  fileSize?: InputMaybe<Scalars['Int']['input']>;
  genreIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  title: Scalars['String']['input'];
  trackNumber?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateUserInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type Genre = {
  __typename?: 'Genre';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tracks: Array<Track>;
};

export type Mutation = {
  __typename?: 'Mutation';
  addTracksToPlaylist: Playlist;
  createAlbum: Album;
  createArtist: Artist;
  createGenre: Genre;
  createPlaylist: Playlist;
  createTrack: Track;
  createUser: User;
  deleteAlbum: Scalars['Boolean']['output'];
  deleteArtist: Scalars['Boolean']['output'];
  deleteGenre: Scalars['Boolean']['output'];
  deletePlaylist: Scalars['Boolean']['output'];
  deleteTrack: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  likeTrack: Track;
  login: AuthPayload;
  removeTracksFromPlaylist: Playlist;
  reorderPlaylistTracks: Playlist;
  unlikeTrack: Track;
  updateAlbum?: Maybe<Album>;
  updateArtist?: Maybe<Artist>;
  updateGenre?: Maybe<Genre>;
  updatePlaylist?: Maybe<Playlist>;
  updateTrack?: Maybe<Track>;
  updateUser?: Maybe<User>;
};


export type MutationAddTracksToPlaylistArgs = {
  input: AddTracksToPlaylistInput;
};


export type MutationCreateAlbumArgs = {
  input: CreateAlbumInput;
};


export type MutationCreateArtistArgs = {
  input: CreateArtistInput;
};


export type MutationCreateGenreArgs = {
  input: CreateGenreInput;
};


export type MutationCreatePlaylistArgs = {
  input: CreatePlaylistInput;
};


export type MutationCreateTrackArgs = {
  input: CreateTrackInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationDeleteAlbumArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteArtistArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteGenreArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePlaylistArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTrackArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLikeTrackArgs = {
  trackId: Scalars['ID']['input'];
};


export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationRemoveTracksFromPlaylistArgs = {
  input: RemoveTracksFromPlaylistInput;
};


export type MutationReorderPlaylistTracksArgs = {
  input: ReorderPlaylistTracksInput;
};


export type MutationUnlikeTrackArgs = {
  trackId: Scalars['ID']['input'];
};


export type MutationUpdateAlbumArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAlbumInput;
};


export type MutationUpdateArtistArgs = {
  id: Scalars['ID']['input'];
  input: UpdateArtistInput;
};


export type MutationUpdateGenreArgs = {
  id: Scalars['ID']['input'];
  input: UpdateGenreInput;
};


export type MutationUpdatePlaylistArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePlaylistInput;
};


export type MutationUpdateTrackArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTrackInput;
};


export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};

export type Playlist = {
  __typename?: 'Playlist';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isPublic: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  trackCount: Scalars['Int']['output'];
  tracks: Array<Track>;
  type?: Maybe<PlaylistType>;
  updatedAt: Scalars['String']['output'];
};

export enum PlaylistType {
  Liked = 'liked',
  Suggested = 'suggested'
}

export type Query = {
  __typename?: 'Query';
  album?: Maybe<Album>;
  albums: Array<Album>;
  artist?: Maybe<Artist>;
  artists: Array<Artist>;
  genre?: Maybe<Genre>;
  genres: Array<Genre>;
  me: User;
  myPlaylists: Array<Playlist>;
  playlist?: Maybe<Playlist>;
  searchMusic: SearchResults;
  track?: Maybe<Track>;
  tracks: Array<Track>;
};


export type QueryAlbumArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAlbumsArgs = {
  artistId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryArtistArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGenreArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMyPlaylistsArgs = {
  type?: InputMaybe<PlaylistType>;
};


export type QueryPlaylistArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySearchMusicArgs = {
  query: Scalars['String']['input'];
};


export type QueryTrackArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTracksArgs = {
  albumId?: InputMaybe<Scalars['ID']['input']>;
};

export type RemoveTracksFromPlaylistInput = {
  playlistId: Scalars['ID']['input'];
  trackIds: Array<Scalars['ID']['input']>;
};

export type ReorderPlaylistTracksInput = {
  playlistId: Scalars['ID']['input'];
  trackIds: Array<Scalars['ID']['input']>;
};

export type SearchResults = {
  __typename?: 'SearchResults';
  albums: Array<Album>;
  artists: Array<Artist>;
  playlists: Array<Playlist>;
  tracks: Array<Track>;
};

export type Track = {
  __typename?: 'Track';
  album: Album;
  createdAt: Scalars['String']['output'];
  discNumber?: Maybe<Scalars['Int']['output']>;
  duration?: Maybe<Scalars['Int']['output']>;
  fileFormat?: Maybe<Scalars['String']['output']>;
  filePath: Scalars['String']['output'];
  fileSize?: Maybe<Scalars['Int']['output']>;
  genres: Array<Genre>;
  id: Scalars['ID']['output'];
  liked: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
  trackArtist?: Maybe<Scalars['String']['output']>;
  trackNumber?: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type UpdateAlbumInput = {
  artistId?: InputMaybe<Scalars['ID']['input']>;
  coverUrl?: InputMaybe<Scalars['String']['input']>;
  releaseYear?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateArtistInput = {
  bio?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGenreInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePlaylistInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTrackInput = {
  albumId?: InputMaybe<Scalars['ID']['input']>;
  discNumber?: InputMaybe<Scalars['Int']['input']>;
  duration?: InputMaybe<Scalars['Int']['input']>;
  fileFormat?: InputMaybe<Scalars['String']['input']>;
  filePath?: InputMaybe<Scalars['String']['input']>;
  fileSize?: InputMaybe<Scalars['Int']['input']>;
  genreIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  trackNumber?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateUserInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lastName: Scalars['String']['output'];
  role: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  verifiedAt?: Maybe<Scalars['String']['output']>;
};
