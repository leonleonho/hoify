import supertest from "supertest";

type SuperTestAgent = ReturnType<typeof supertest>;

// ---------------------------------------------------------------------------
// GraphQL query / mutation constants
// ---------------------------------------------------------------------------

export const CREATE_USER_MUTATION = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      firstName
      lastName
      role
      isActive
      verifiedAt
      createdAt
      updatedAt
    }
  }
`;

export const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        firstName
        lastName
        role
        isActive
      }
    }
  }
`;

export const ME_QUERY = `
  query Me {
    me {
      id
      email
      firstName
      lastName
      role
      isActive
      verifiedAt
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_USER_MUTATION = `
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      firstName
      lastName
    }
  }
`;

export const DELETE_USER_MUTATION = `
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

// ---------------------------------------------------------------------------
// Music query / mutation constants
// ---------------------------------------------------------------------------

export const CREATE_ARTIST_MUTATION = `
  mutation CreateArtist($input: CreateArtistInput!) {
    createArtist(input: $input) {
      id
      name
      bio
      imageUrl
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ARTIST_MUTATION = `
  mutation UpdateArtist($id: ID!, $input: UpdateArtistInput!) {
    updateArtist(id: $id, input: $input) {
      id
      name
      bio
      imageUrl
    }
  }
`;

export const DELETE_ARTIST_MUTATION = `
  mutation DeleteArtist($id: ID!) {
    deleteArtist(id: $id)
  }
`;

export const CREATE_ALBUM_MUTATION = `
  mutation CreateAlbum($input: CreateAlbumInput!) {
    createAlbum(input: $input) {
      id
      title
      releaseYear
      coverUrl
      artist {
        id
      }
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ALBUM_MUTATION = `
  mutation UpdateAlbum($id: ID!, $input: UpdateAlbumInput!) {
    updateAlbum(id: $id, input: $input) {
      id
      title
      artist {
        id
      }
      releaseYear
      coverUrl
    }
  }
`;

export const DELETE_ALBUM_MUTATION = `
  mutation DeleteAlbum($id: ID!) {
    deleteAlbum(id: $id)
  }
`;

export const CREATE_TRACK_MUTATION = `
  mutation CreateTrack($input: CreateTrackInput!) {
    createTrack(input: $input) {
      id
      title
      trackNumber
      discNumber
      duration
      filePath
      fileFormat
      fileSize
      album {
        id
      }
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_TRACK_MUTATION = `
  mutation UpdateTrack($id: ID!, $input: UpdateTrackInput!) {
    updateTrack(id: $id, input: $input) {
      id
      title
      trackNumber
      duration
      filePath
      album {
        id
      }
    }
  }
`;

export const DELETE_TRACK_MUTATION = `
  mutation DeleteTrack($id: ID!) {
    deleteTrack(id: $id)
  }
`;

export const CREATE_GENRE_MUTATION = `
  mutation CreateGenre($input: CreateGenreInput!) {
    createGenre(input: $input) {
      id
      name
    }
  }
`;

export const UPDATE_GENRE_MUTATION = `
  mutation UpdateGenre($id: ID!, $input: UpdateGenreInput!) {
    updateGenre(id: $id, input: $input) {
      id
      name
    }
  }
`;

export const DELETE_GENRE_MUTATION = `
  mutation DeleteGenre($id: ID!) {
    deleteGenre(id: $id)
  }
`;

export const ARTISTS_QUERY = `
  query Artists {
    artists {
      id
      name
      bio
      imageUrl
    }
  }
`;

export const ARTIST_QUERY = `
  query Artist($id: ID!) {
    artist(id: $id) {
      id
      name
      bio
      imageUrl
      albums {
        id
        title
      }
    }
  }
`;

export const ALBUMS_QUERY = `
  query Albums($artistId: ID) {
    albums(artistId: $artistId) {
      id
      title
      releaseYear
      coverUrl
      artist {
        id
      }
    }
  }
`;

export const ALBUM_QUERY = `
  query Album($id: ID!) {
    album(id: $id) {
      id
      title
      releaseYear
      coverUrl
      artist {
        id
        name
      }
      tracks {
        id
        title
      }
    }
  }
`;

export const TRACKS_QUERY = `
  query Tracks($albumId: ID) {
    tracks(albumId: $albumId) {
      id
      title
      trackNumber
      discNumber
      duration
      filePath
      fileFormat
      fileSize
      album {
        id
      }
    }
  }
`;

export const TRACK_QUERY = `
  query Track($id: ID!) {
    track(id: $id) {
      id
      title
      trackNumber
      duration
      filePath
      album {
        id
        title
        artist {
          id
          name
        }
      }
      genres {
        id
        name
      }
    }
  }
`;

export const GENRES_QUERY = `
  query Genres {
    genres {
      id
      name
    }
  }
`;

export const GENRE_QUERY = `
  query Genre($id: ID!) {
    genre(id: $id) {
      id
      name
    }
  }
`;

export const SEARCH_MUSIC_QUERY = `
  query SearchMusic($query: String!) {
    searchMusic(query: $query) {
      artists {
        id
        name
      }
      albums {
        id
        title
      }
      tracks {
        id
        title
      }
      playlists {
        id
        name
        isPublic
        trackCount
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Playlist query / mutation constants
// ---------------------------------------------------------------------------

export const CREATE_PLAYLIST_MUTATION = `
  mutation CreatePlaylist($input: CreatePlaylistInput!) {
    createPlaylist(input: $input) {
      id
      name
      description
      isPublic
      trackCount
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PLAYLIST_MUTATION = `
  mutation UpdatePlaylist($id: ID!, $input: UpdatePlaylistInput!) {
    updatePlaylist(id: $id, input: $input) {
      id
      name
      description
      isPublic
    }
  }
`;

export const DELETE_PLAYLIST_MUTATION = `
  mutation DeletePlaylist($id: ID!) {
    deletePlaylist(id: $id)
  }
`;

export const ADD_TRACKS_MUTATION = `
  mutation AddTracksToPlaylist($input: AddTracksToPlaylistInput!) {
    addTracksToPlaylist(input: $input) {
      id
      name
      tracks {
        id
        title
      }
      trackCount
    }
  }
`;

export const REMOVE_TRACKS_MUTATION = `
  mutation RemoveTracksFromPlaylist($input: RemoveTracksFromPlaylistInput!) {
    removeTracksFromPlaylist(input: $input) {
      id
      trackCount
    }
  }
`;

export const REORDER_TRACKS_MUTATION = `
  mutation ReorderPlaylistTracks($input: ReorderPlaylistTracksInput!) {
    reorderPlaylistTracks(input: $input) {
      id
      tracks {
        id
        title
      }
    }
  }
`;

export const MY_PLAYLISTS_QUERY = `
  query MyPlaylists {
    myPlaylists {
      id
      name
      description
      isPublic
      trackCount
      createdAt
      updatedAt
    }
  }
`;

export const PLAYLIST_QUERY = `
  query Playlist($id: ID!) {
    playlist(id: $id) {
      id
      name
      description
      isPublic
      tracks {
        id
        title
      }
      trackCount
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GraphQLResponse<T = Record<string, unknown>> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: Record<string, unknown>;
  }>;
}

// ---------------------------------------------------------------------------
// Helper: execute a GraphQL operation via supertest
// ---------------------------------------------------------------------------

/**
 * Send a GraphQL operation via supertest.
 *
 * @param agent  - supertest agent wrapping the Express app
 * @param query  - the GraphQL query/mutation string
 * @param variables - optional variables object
 * @param token  - optional JWT for Authorization header
 */
export async function executeGraphQL<T = Record<string, unknown>>(
  agent: SuperTestAgent,
  {
    query,
    variables,
    token,
  }: {
    query: string;
    variables?: Record<string, unknown>;
    token?: string;
  },
): Promise<GraphQLResponse<T>> {
  const req = agent
    .post("/graphql")
    .send({ query, variables })
    .set("Content-Type", "application/json")
    .set("Accept", "application/json");

  if (token) {
    req.set("Authorization", `Bearer ${token}`);
  }

  const res = await req;
  return res.body as GraphQLResponse<T>;
}