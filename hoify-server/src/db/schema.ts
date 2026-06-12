import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

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

export const artists = pgTable("artists", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  bio: text("bio"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const artistsRelations = relations(artists, ({ many }) => ({
  albums: many(albums),
}));

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

export const albums = pgTable("albums", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  artistId: uuid("artist_id")
    .notNull()
    .references(() => artists.id),
  releaseYear: integer("release_year"),
  coverUrl: text("cover_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

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

export const tracks = pgTable("tracks", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  albumId: uuid("album_id")
    .notNull()
    .references(() => albums.id),
  trackNumber: integer("track_number"),
  discNumber: integer("disc_number").default(1),
  duration: integer("duration"),
  filePath: text("file_path").notNull(),
  fileFormat: text("file_format"),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

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