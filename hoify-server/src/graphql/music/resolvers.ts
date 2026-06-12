import { fmtDate } from "./services.js";
import {
  listArtists,
  getArtist,
  createArtist,
  updateArtist,
  deleteArtist,
  listAlbums,
  getAlbum,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  listTracks,
  getTrack,
  createTrack,
  updateTrack,
  deleteTrack,
  listGenres,
  getGenre,
  createGenre,
  updateGenre,
  deleteGenre,
  getTrackGenres,
  getGenreTracks,
  searchMusic,
} from "./services.js";

export const resolvers = {
  Artist: {
    albums: (parent: { id: string }) => listAlbums(parent.id),
    createdAt: (parent: { createdAt: Date | string }) => fmtDate(parent.createdAt),
    updatedAt: (parent: { updatedAt: Date | string }) => fmtDate(parent.updatedAt),
  },

  Album: {
    artist: (parent: { artistId: string }) => getArtist(parent.artistId),
    tracks: (parent: { id: string }) => listTracks(parent.id),
    createdAt: (parent: { createdAt: Date | string }) => fmtDate(parent.createdAt),
    updatedAt: (parent: { updatedAt: Date | string }) => fmtDate(parent.updatedAt),
  },

  Track: {
    album: (parent: { albumId: string }) => getAlbum(parent.albumId),
    genres: (parent: { id: string }) => getTrackGenres(parent.id),
    createdAt: (parent: { createdAt: Date | string }) => fmtDate(parent.createdAt),
    updatedAt: (parent: { updatedAt: Date | string }) => fmtDate(parent.updatedAt),
  },

  Genre: {
    tracks: (parent: { id: string }) => getGenreTracks(parent.id),
  },

  Query: {
    searchMusic: (_: unknown, args: { query: string }) => searchMusic(args.query),
    artists: () => listArtists(),
    artist: (_: unknown, args: { id: string }) => getArtist(args.id),
    albums: (_: unknown, args: { artistId?: string }) =>
      listAlbums(args.artistId ?? null),
    album: (_: unknown, args: { id: string }) => getAlbum(args.id),
    tracks: (_: unknown, args: { albumId?: string }) =>
      listTracks(args.albumId ?? null),
    track: (_: unknown, args: { id: string }) => getTrack(args.id),
    genres: () => listGenres(),
    genre: (_: unknown, args: { id: string }) => getGenre(args.id),
  },

  Mutation: {
    createArtist: (
      _: unknown,
      args: { input: { name: string; bio?: string; imageUrl?: string } },
    ) => createArtist(args.input),

    updateArtist: (
      _: unknown,
      args: {
        id: string;
        input: { name?: string; bio?: string; imageUrl?: string };
      },
    ) => updateArtist(args.id, args.input),

    deleteArtist: (_: unknown, args: { id: string }) => deleteArtist(args.id),

    createAlbum: (
      _: unknown,
      args: {
        input: {
          title: string;
          artistId: string;
          releaseYear?: number;
          coverUrl?: string;
        };
      },
    ) => createAlbum(args.input),

    updateAlbum: (
      _: unknown,
      args: {
        id: string;
        input: {
          title?: string;
          artistId?: string;
          releaseYear?: number;
          coverUrl?: string;
        };
      },
    ) => updateAlbum(args.id, args.input),

    deleteAlbum: (_: unknown, args: { id: string }) => deleteAlbum(args.id),

    createTrack: (
      _: unknown,
      args: {
        input: {
          title: string;
          albumId: string;
          trackNumber?: number;
          discNumber?: number;
          duration?: number;
          filePath: string;
          fileFormat?: string;
          fileSize?: number;
          genreIds?: string[];
        };
      },
    ) => createTrack(args.input),

    updateTrack: (
      _: unknown,
      args: {
        id: string;
        input: {
          title?: string;
          albumId?: string;
          trackNumber?: number;
          discNumber?: number;
          duration?: number;
          filePath?: string;
          fileFormat?: string;
          fileSize?: number;
          genreIds?: string[];
        };
      },
    ) => updateTrack(args.id, args.input),

    deleteTrack: (_: unknown, args: { id: string }) => deleteTrack(args.id),

    createGenre: (
      _: unknown,
      args: { input: { name: string } },
    ) => createGenre(args.input),

    updateGenre: (
      _: unknown,
      args: { id: string; input: { name?: string } },
    ) => updateGenre(args.id, args.input),

    deleteGenre: (_: unknown, args: { id: string }) => deleteGenre(args.id),
  },
};
