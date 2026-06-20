import {
  boolean,
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const playlistTypeEnum = pgEnum("playlist_type", ["liked", "suggested"]);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------------

export const artists = pgTable(
  "artists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    bio: text("bio"),
    imageUrl: text("image_url"),
    aliases: text("aliases").array().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("idx_artists_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`),
    index("idx_artists_aliases_gin").using("gin", sql`${t.aliases}`),
  ],
);

export const artistsRelations = relations(artists, ({ many }) => ({
  albums: many(albums),
}));

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

export const albums = pgTable(
  "albums",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id),
    releaseYear: integer("release_year"),
    coverUrl: text("cover_url"),
    aliases: text("aliases").array().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("albums_artist_id_idx").on(t.artistId),
    uniqueIndex("albums_title_artist_idx").on(t.title, t.artistId),
    index("idx_albums_title_trgm").using("gin", sql`${t.title} gin_trgm_ops`),
    index("idx_albums_aliases_gin").using("gin", sql`${t.aliases}`),
  ],
);

export const albumsRelations = relations(albums, ({ one, many }) => ({
  artist: one(artists, {
    fields: [albums.artistId],
    references: [artists.id],
  }),
  tracks: many(tracks),
}));

export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

export const tracks = pgTable(
  "tracks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    albumId: uuid("album_id")
      .notNull()
      .references(() => albums.id),
    trackNumber: integer("track_number"),
    discNumber: integer("disc_number").default(1),
    duration: integer("duration"),
    trackArtist: text("track_artist"),
    filePath: text("file_path").notNull(),
    fileFormat: text("file_format"),
    fileSize: integer("file_size"),
    fileMtime: bigint("file_mtime", { mode: "number" }),
    acoustidFingerprint: text("acoustid_fingerprint"),
    musicbrainzRecordingId: text("musicbrainz_recording_id"),
    musicbrainzArtistId: text("musicbrainz_artist_id"),
    musicbrainzAlbumId: text("musicbrainz_album_id"),
    aliases: text("aliases").array().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    filePathIdx: uniqueIndex("tracks_file_path_idx").on(t.filePath),
    albumIdIdx: index("tracks_album_id_idx").on(t.albumId),
    titleTrgmIdx: index("idx_tracks_title_trgm").using("gin", sql`${t.title} gin_trgm_ops`),
    aliasesGinIdx: index("idx_tracks_aliases_gin").using("gin", sql`${t.aliases}`),
  }),
);

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  album: one(albums, {
    fields: [tracks.albumId],
    references: [albums.id],
  }),
  trackGenres: many(trackGenres),
}));

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;

// ---------------------------------------------------------------------------
// Genres
// ---------------------------------------------------------------------------

export const genres = pgTable("genres", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
});

export const genresRelations = relations(genres, ({ many }) => ({
  trackGenres: many(trackGenres),
}));

export type Genre = typeof genres.$inferSelect;
export type NewGenre = typeof genres.$inferInsert;

// ---------------------------------------------------------------------------
// Track-Genre junction
// ---------------------------------------------------------------------------

export const trackGenres = pgTable(
  "track_genres",
  {
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genres.id),
  },
  (t) => [primaryKey({ columns: [t.trackId, t.genreId] })],
);

export const trackGenresRelations = relations(trackGenres, ({ one }) => ({
  track: one(tracks, {
    fields: [trackGenres.trackId],
    references: [tracks.id],
  }),
  genre: one(genres, {
    fields: [trackGenres.genreId],
    references: [genres.id],
  }),
}));

export type TrackGenre = typeof trackGenres.$inferSelect;
export type NewTrackGenre = typeof trackGenres.$inferInsert;

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------

export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    isPublic: boolean("is_public").notNull().default(false),
    type: playlistTypeEnum("type"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("one_liked_per_user").on(t.userId).where(sql`type = 'liked'`),
    index("playlists_user_id_idx").on(t.userId),
    index("idx_playlists_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`),
  ],
);

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  user: one(users, {
    fields: [playlists.userId],
    references: [users.id],
  }),
  playlistTracks: many(playlistTracks),
}));

export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;

// ---------------------------------------------------------------------------
// Playlist-Tracks junction
// ---------------------------------------------------------------------------

export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id),
    position: integer("position").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [primaryKey({ columns: [t.playlistId, t.trackId] })],
);

export const playlistTracksRelations = relations(playlistTracks, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistTracks.playlistId],
    references: [playlists.id],
  }),
  track: one(tracks, {
    fields: [playlistTracks.trackId],
    references: [tracks.id],
  }),
}));

export type PlaylistTrack = typeof playlistTracks.$inferSelect;
export type NewPlaylistTrack = typeof playlistTracks.$inferInsert;