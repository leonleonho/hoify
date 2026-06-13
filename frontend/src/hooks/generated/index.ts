/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
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
  createAlbum: Album;
  createArtist: Artist;
  createGenre: Genre;
  createTrack: Track;
  createUser: User;
  deleteAlbum: Scalars['Boolean']['output'];
  deleteArtist: Scalars['Boolean']['output'];
  deleteGenre: Scalars['Boolean']['output'];
  deleteTrack: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  login: AuthPayload;
  updateAlbum?: Maybe<Album>;
  updateArtist?: Maybe<Artist>;
  updateGenre?: Maybe<Genre>;
  updateTrack?: Maybe<Track>;
  updateUser?: Maybe<User>;
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


export type MutationDeleteTrackArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
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


export type MutationUpdateTrackArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTrackInput;
};


export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};

export type Query = {
  __typename?: 'Query';
  album?: Maybe<Album>;
  albums: Array<Album>;
  artist?: Maybe<Artist>;
  artists: Array<Artist>;
  genre?: Maybe<Genre>;
  genres: Array<Genre>;
  me: User;
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


export type QuerySearchMusicArgs = {
  query: Scalars['String']['input'];
};


export type QueryTrackArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTracksArgs = {
  albumId?: InputMaybe<Scalars['ID']['input']>;
};

export type SearchResults = {
  __typename?: 'SearchResults';
  albums: Array<Album>;
  artists: Array<Artist>;
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
  title: Scalars['String']['output'];
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

export type HelloQueryVariables = Exact<{ [key: string]: never; }>;


export type HelloQuery = { artists: Array<{ id: string, name: string }> };


export const HelloDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Hello"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"artists"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<HelloQuery, HelloQueryVariables>;