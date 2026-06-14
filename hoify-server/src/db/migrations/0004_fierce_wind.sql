-- Full-text search index for playlist names
CREATE INDEX playlists_name_fts_idx ON playlists USING GIN (to_tsvector('english', name));
