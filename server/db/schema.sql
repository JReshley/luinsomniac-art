-- The complete shape of the database. Safe to run against an empty database,
-- and safe to run twice.
--
-- This file is committed on purpose. Your schema is a fact about your
-- application, not a runtime concern: it should be readable by opening a file
-- rather than by connecting to a server. It is also what lets you move to a
-- hosted database in one command.
--
-- What it models: the works on the portfolio (artworks, 3D models and videos),
-- the files they use, and the few site-wide settings the admin can edit. The
-- admin screens in client/src/admin work against a mock of exactly these
-- tables (client/src/api/), with camelCase names where Postgres uses
-- snake_case.
--
-- Rules live here, not only in the screens. The API checks them too, to give a
-- friendly message, but the database is what refuses a bad row if a screen or
-- a route forgets to.
--
-- Run on Supabase or on a plain local Postgres. On Supabase, `admins.user_id`
-- is linked to Supabase Auth's users; elsewhere there is no such table, so the
-- link is skipped (see the end of the admins section).
--
-- Needs Postgres 13 or newer, for the built-in gen_random_uuid(). Supabase and
-- the postgres:17 image in compose.yml both qualify.

-- Types ----------------------------------------------------------------------
-- CREATE TYPE has no IF NOT EXISTS, so each one is made only when missing.

DO $$ BEGIN
  CREATE TYPE work_kind AS ENUM ('artwork', 'model', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- draft and ready are private; only published works reach the public site.
-- Archived is what the admin calls "Delete": the row stays so it can come back.
DO $$ BEGIN
  CREATE TYPE work_status AS ENUM ('draft', 'ready', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Where a file lives: the Supabase bucket, a Google Drive share link, a
-- YouTube video, or any other https image link.
DO $$ BEGIN
  CREATE TYPE media_source AS ENUM ('supabase', 'gdrive', 'youtube', 'external');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE media_kind AS ENUM ('image', 'model', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admins ---------------------------------------------------------------------
-- The allowlist. Signing in with Supabase Auth is not enough on its own: the
-- API also checks the user is a row here. Sign-ups are switched off, so rows
-- are added by hand for the two admins.

CREATE TABLE IF NOT EXISTS admins (
  user_id      UUID PRIMARY KEY,
  display_name TEXT NOT NULL CHECK (length(btrim(display_name)) > 0),
  role         TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin'))
);

-- Tie user_id to Supabase Auth when it's there, so deleting a user removes
-- their admin row. A plain Postgres has no auth schema, and skips this.
DO $$ BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    ALTER TABLE admins
      ADD CONSTRAINT admins_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Media ----------------------------------------------------------------------
-- Every file the site uses, wherever it's stored. For an upload,
-- storage_path_or_url is the path in the bucket ("images/<id>.webp"); for
-- anything else it is the link.

CREATE TABLE IF NOT EXISTS media (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source              media_source NOT NULL,
  kind                media_kind   NOT NULL,
  storage_path_or_url TEXT         NOT NULL CHECK (length(btrim(storage_path_or_url)) > 0),
  mime                TEXT,
  width               INTEGER CHECK (width  > 0),
  height              INTEGER CHECK (height > 0),
  bytes               BIGINT  CHECK (bytes >= 0),
  sha256              TEXT    CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  alt_text            TEXT    NOT NULL DEFAULT '',
  uploaded_by         UUID    REFERENCES admins (user_id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- The same link twice is the same file.
  UNIQUE (storage_path_or_url),
  -- YouTube links are videos and nothing else is.
  CONSTRAINT media_youtube_is_video CHECK ((source = 'youtube') = (kind = 'video')),
  -- The 3D viewer can only load a .glb from the bucket: Drive and other links
  -- are blocked from it.
  CONSTRAINT media_model_is_uploaded CHECK (kind <> 'model' OR source = 'supabase'),
  -- Only uploads are measured and hashed.
  CONSTRAINT media_upload_has_size CHECK (source <> 'supabase' OR bytes IS NOT NULL)
);

-- The same file uploaded twice is stored once. Partial, because linked files
-- have no hash.
CREATE UNIQUE INDEX IF NOT EXISTS media_sha256_key ON media (sha256) WHERE sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS media_created_at_idx ON media (created_at DESC);

-- Categories -----------------------------------------------------------------
-- The Museum's filter chips, in sort_order.

CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 40),
  slug       TEXT    NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- "Props" and "props" are the same category.
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_key ON categories (lower(name));

-- Works ----------------------------------------------------------------------
-- Artworks, 3D models and videos in one table. What only a model or a video
-- has lives in model_details and video_details.

CREATE TABLE IF NOT EXISTS works (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind           work_kind   NOT NULL,
  title          TEXT        NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  year           INTEGER     CHECK (year BETWEEN 1900 AND 2100),
  category_id    UUID        REFERENCES categories (id) ON DELETE RESTRICT,
  description    TEXT        NOT NULL DEFAULT '',
  tags           TEXT[]      NOT NULL DEFAULT '{}',
  cover_media_id UUID        REFERENCES media (id) ON DELETE RESTRICT,
  featured       BOOLEAN     NOT NULL DEFAULT false,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  status         work_status NOT NULL DEFAULT 'draft',

  -- Rights. Consent answers are kept in the Consent and Rights sheet; these
  -- are the answers the publish gate below needs.
  is_own_work     BOOLEAN NOT NULL DEFAULT true,
  shows_real_face BOOLEAN NOT NULL DEFAULT false,
  face_consent    BOOLEAN NOT NULL DEFAULT false,

  -- Never sent by the public API.
  notes_artist TEXT NOT NULL DEFAULT '',
  notes_admin  TEXT NOT NULL DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID        REFERENCES admins (user_id) ON DELETE SET NULL,

  -- The publish gate: only own work is published, and a real person's face
  -- only with their consent. Everything else can be saved as a draft.
  CONSTRAINT works_publish_gate CHECK (
    status <> 'published' OR (is_own_work AND (NOT shows_real_face OR face_consent))
  ),

  -- Lets model_details and video_details point at a work of the right kind.
  UNIQUE (id, kind)
);

CREATE INDEX IF NOT EXISTS works_status_sort_idx ON works (status, sort_order);
CREATE INDEX IF NOT EXISTS works_category_idx    ON works (category_id);
CREATE INDEX IF NOT EXISTS works_cover_idx       ON works (cover_media_id);

-- updated_at is set by the database, so it can't be forgotten or faked.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS works_set_updated_at ON works;
CREATE TRIGGER works_set_updated_at BEFORE UPDATE ON works
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3D models ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS model_details (
  work_id            UUID PRIMARY KEY,
  -- Always 'model'; with the foreign key below it makes a model's details
  -- impossible to attach to an artwork or a video.
  kind               work_kind NOT NULL DEFAULT 'model' CHECK (kind = 'model'),
  software           TEXT[]    NOT NULL DEFAULT '{}',
  process_notes      TEXT      NOT NULL DEFAULT '',
  model_media_id     UUID      REFERENCES media (id) ON DELETE RESTRICT,
  turntable_media_id UUID      REFERENCES media (id) ON DELETE RESTRICT,
  poly_count         INTEGER   CHECK (poly_count >= 0),
  textured           BOOLEAN   NOT NULL DEFAULT false,
  external_url       TEXT      CHECK (external_url ~ '^https://'),
  FOREIGN KEY (work_id, kind) REFERENCES works (id, kind) ON DELETE CASCADE
);

-- Videos ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS video_details (
  work_id         UUID PRIMARY KEY,
  kind            work_kind NOT NULL DEFAULT 'video' CHECK (kind = 'video'),
  media_id        UUID      REFERENCES media (id) ON DELETE RESTRICT,
  duration        INTEGER   CHECK (duration >= 0),   -- seconds
  audio_cleared   BOOLEAN   NOT NULL DEFAULT false,
  related_work_id UUID      REFERENCES works (id) ON DELETE SET NULL,
  FOREIGN KEY (work_id, kind) REFERENCES works (id, kind) ON DELETE CASCADE
);

-- Gallery --------------------------------------------------------------------
-- Extra images and YouTube videos shown with a work, in sort_order, for any
-- kind of work. A model's .glb goes in model_details, not here.

CREATE TABLE IF NOT EXISTS work_media (
  work_id    UUID    NOT NULL REFERENCES works (id) ON DELETE CASCADE,
  media_id   UUID    NOT NULL REFERENCES media (id) ON DELETE RESTRICT,
  caption    TEXT    NOT NULL DEFAULT '' CHECK (length(caption) <= 200),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (work_id, media_id)
);

-- "Where is this file used?" looks up by media_id.
CREATE INDEX IF NOT EXISTS work_media_media_idx ON work_media (media_id);

-- The rules about which kind of file goes where need to look at another table,
-- which a CHECK can't do, so they're triggers.
CREATE OR REPLACE FUNCTION check_media_roles() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'model_details' THEN
    IF NEW.model_media_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM media WHERE id = NEW.model_media_id AND kind = 'model') THEN
      RAISE EXCEPTION 'A model needs an uploaded .glb file' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.turntable_media_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM media WHERE id = NEW.turntable_media_id AND kind = 'image') THEN
      RAISE EXCEPTION 'A turntable has to be an image' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF TG_TABLE_NAME = 'video_details' THEN
    IF NEW.media_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM media WHERE id = NEW.media_id AND source = 'youtube') THEN
      RAISE EXCEPTION 'A video has to be a YouTube link' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF TG_TABLE_NAME = 'work_media' THEN
    IF EXISTS (SELECT 1 FROM media WHERE id = NEW.media_id AND kind = 'model') THEN
      RAISE EXCEPTION 'The gallery takes images and videos, not 3D models' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS model_details_media_roles ON model_details;
CREATE TRIGGER model_details_media_roles BEFORE INSERT OR UPDATE ON model_details
  FOR EACH ROW EXECUTE FUNCTION check_media_roles();

DROP TRIGGER IF EXISTS video_details_media_roles ON video_details;
CREATE TRIGGER video_details_media_roles BEFORE INSERT OR UPDATE ON video_details
  FOR EACH ROW EXECUTE FUNCTION check_media_roles();

DROP TRIGGER IF EXISTS work_media_media_roles ON work_media;
CREATE TRIGGER work_media_media_roles BEFORE INSERT OR UPDATE ON work_media
  FOR EACH ROW EXECUTE FUNCTION check_media_roles();

-- Site content ---------------------------------------------------------------

-- Headings and paragraphs, under a key that says where they appear
-- ("home.hero.intro").
CREATE TABLE IF NOT EXISTS site_text (
  key        TEXT PRIMARY KEY CHECK (key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  value      TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID        REFERENCES admins (user_id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS site_text_set_updated_at ON site_text;
CREATE TRIGGER site_text_set_updated_at BEFORE UPDATE ON site_text
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS social_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform   TEXT    NOT NULL CHECK (platform = lower(btrim(platform)) AND platform <> ''),
  handle     TEXT    NOT NULL DEFAULT '',
  url        TEXT    NOT NULL CHECK (url ~ '^https://\S+$'),
  visible    BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- The contact email, display name and the logo, icon and portrait. A null
-- value or media_id means the site uses the copy bundled in the repo.
CREATE TABLE IF NOT EXISTS settings (
  key      TEXT PRIMARY KEY CHECK (key IN ('contact_email', 'display_name', 'logo', 'icon', 'portrait')),
  value    TEXT,
  media_id UUID REFERENCES media (id) ON DELETE RESTRICT,
  -- Text settings have no image and image settings have no text.
  CHECK (key IN ('logo', 'icon', 'portrait') OR media_id IS NULL),
  CHECK (key NOT IN ('logo', 'icon', 'portrait') OR value IS NULL),
  CHECK (key <> 'contact_email' OR (value IS NOT NULL AND value ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')),
  CHECK (key <> 'display_name' OR (value IS NOT NULL AND length(btrim(value)) > 0))
);

-- Activity ---------------------------------------------------------------------
-- Who changed what, for the dashboard's recent activity and each work's
-- history. entity_id is text because it's a uuid for most things and a key for
-- site text.

CREATE TABLE IF NOT EXISTS activity_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID REFERENCES admins (user_id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  summary    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_entity_idx     ON activity_log (entity, entity_id, created_at DESC);

-- Lock the tables from Supabase's own data API ---------------------------------
-- Supabase publishes every table through a REST API that anyone holding the
-- public (anon) key can call. Row-level security with no policies turns that
-- off: nothing is readable or writable through it. The Express server connects
-- as the database owner, which skips these rules, so it is unaffected. All
-- reads and writes go through Express, which checks the admin allowlist.

ALTER TABLE admins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE media         ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE works         ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_media    ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_text     ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log  ENABLE ROW LEVEL SECURITY;
