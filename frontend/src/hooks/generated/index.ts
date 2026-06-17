/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type AddTracksToPlaylistInput = {
  playlistId: string | number;
  position: number;
  trackIds: Array<string | number>;
};

export type CreatePlaylistInput = {
  description?: string | null | undefined;
  isPublic?: boolean | null | undefined;
  name: string;
  trackIds?: Array<string | number> | null | undefined;
};

export type AddTracksToPlaylistMutationVariables = Exact<{
  input: AddTracksToPlaylistInput;
}>;


export type AddTracksToPlaylistMutation = { addTracksToPlaylist: { id: string, trackCount: number } };

export type CreatePlaylistMutationVariables = Exact<{
  input: CreatePlaylistInput;
}>;


export type CreatePlaylistMutation = { createPlaylist: { id: string, name: string, trackCount: number } };

export type LikeTrackMutationVariables = Exact<{
  trackId: string | number;
}>;


export type LikeTrackMutation = { likeTrack: { id: string, liked: boolean } };

export type LoginMutationVariables = Exact<{
  email: string;
  password: string;
}>;


export type LoginMutation = { login: { token: string, user: { id: string, email: string, firstName: string, lastName: string, role: string } } };

export type UnlikeTrackMutationVariables = Exact<{
  trackId: string | number;
}>;


export type UnlikeTrackMutation = { unlikeTrack: { id: string, liked: boolean } };

export type AlbumQueryVariables = Exact<{
  id: string | number;
}>;


export type AlbumQuery = { album: { id: string, title: string, releaseYear: number | null, coverUrl: string | null, artist: { id: string, name: string, imageUrl: string | null }, tracks: Array<{ id: string, title: string, trackNumber: number | null, duration: number | null, filePath: string, liked: boolean, genres: Array<{ id: string, name: string }> }> } | null };

export type ArtistQueryVariables = Exact<{
  id: string | number;
}>;


export type ArtistQuery = { artist: { id: string, name: string, imageUrl: string | null, bio: string | null, albums: Array<{ id: string, title: string, releaseYear: number | null, coverUrl: string | null, artist: { id: string, name: string }, tracks: Array<{ id: string, title: string, trackNumber: number | null, duration: number | null, filePath: string, liked: boolean, genres: Array<{ id: string, name: string }> }> }> } | null };

export type HelloQueryVariables = Exact<{ [key: string]: never; }>;


export type HelloQuery = { artists: Array<{ id: string, name: string }> };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, email: string, firstName: string, lastName: string, role: string } };

export type MyPlaylistsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPlaylistsQuery = { myPlaylists: Array<{ id: string, name: string, trackCount: number, isPublic: boolean }> };

export type SearchMusicQueryVariables = Exact<{
  query: string;
}>;


export type SearchMusicQuery = { searchMusic: { artists: Array<{ id: string, name: string, imageUrl: string | null }>, albums: Array<{ id: string, title: string, releaseYear: number | null, coverUrl: string | null, artist: { id: string, name: string } }>, tracks: Array<{ id: string, title: string, trackNumber: number | null, duration: number | null, filePath: string, liked: boolean, createdAt: string, updatedAt: string, genres: Array<{ id: string, name: string }>, album: { id: string, title: string, coverUrl: string | null, createdAt: string, updatedAt: string, artist: { id: string, name: string, createdAt: string, updatedAt: string } } }>, playlists: Array<{ id: string, name: string, isPublic: boolean, trackCount: number }> } };


export const AddTracksToPlaylistDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddTracksToPlaylist"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddTracksToPlaylistInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addTracksToPlaylist"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trackCount"}}]}}]}}]} as unknown as DocumentNode<AddTracksToPlaylistMutation, AddTracksToPlaylistMutationVariables>;
export const CreatePlaylistDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePlaylist"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreatePlaylistInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPlaylist"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"trackCount"}}]}}]}}]} as unknown as DocumentNode<CreatePlaylistMutation, CreatePlaylistMutationVariables>;
export const LikeTrackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LikeTrack"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"trackId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"likeTrack"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"trackId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"trackId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"liked"}}]}}]}}]} as unknown as DocumentNode<LikeTrackMutation, LikeTrackMutationVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const UnlikeTrackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnlikeTrack"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"trackId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlikeTrack"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"trackId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"trackId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"liked"}}]}}]}}]} as unknown as DocumentNode<UnlikeTrackMutation, UnlikeTrackMutationVariables>;
export const AlbumDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Album"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"album"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"releaseYear"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tracks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"trackNumber"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}},{"kind":"Field","name":{"kind":"Name","value":"filePath"}},{"kind":"Field","name":{"kind":"Name","value":"liked"}},{"kind":"Field","name":{"kind":"Name","value":"genres"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]} as unknown as DocumentNode<AlbumQuery, AlbumQueryVariables>;
export const ArtistDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Artist"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"artist"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"albums"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"releaseYear"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tracks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"trackNumber"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}},{"kind":"Field","name":{"kind":"Name","value":"filePath"}},{"kind":"Field","name":{"kind":"Name","value":"liked"}},{"kind":"Field","name":{"kind":"Name","value":"genres"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<ArtistQuery, ArtistQueryVariables>;
export const HelloDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Hello"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"artists"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<HelloQuery, HelloQueryVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const MyPlaylistsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyPlaylists"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myPlaylists"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"trackCount"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}}]}}]}}]} as unknown as DocumentNode<MyPlaylistsQuery, MyPlaylistsQueryVariables>;
export const SearchMusicDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchMusic"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"searchMusic"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"artists"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"albums"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"releaseYear"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"tracks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"trackNumber"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}},{"kind":"Field","name":{"kind":"Name","value":"filePath"}},{"kind":"Field","name":{"kind":"Name","value":"liked"}},{"kind":"Field","name":{"kind":"Name","value":"genres"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"album"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"playlists"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"trackCount"}}]}}]}}]}}]} as unknown as DocumentNode<SearchMusicQuery, SearchMusicQueryVariables>;