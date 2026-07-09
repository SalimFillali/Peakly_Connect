-- ================================================================
-- PEAKLY — Migration schéma v2
-- Exécuter APRÈS schema.sql dans le SQL Editor Supabase
-- ================================================================

-- ================================================================
-- 1. EXTENSION TABLE artistes — nouveaux champs onboarding
-- ================================================================

ALTER TABLE artistes
  ADD COLUMN IF NOT EXISTS type_artiste     TEXT DEFAULT 'solo',           -- solo, groupe, producteur, beatmaker, auteur, compositeur, dj
  ADD COLUMN IF NOT EXISTS bio_courte       TEXT,                           -- max 280 chars
  ADD COLUMN IF NOT EXISTS bio_pro          TEXT,                           -- biographie professionnelle longue
  ADD COLUMN IF NOT EXISTS sous_genres      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mood             TEXT[] DEFAULT '{}',            -- festif, mélancolique, club, engagé...
  ADD COLUMN IF NOT EXISTS competences      TEXT[] DEFAULT '{}',            -- chant, rap, prod, écriture, mix, scène
  ADD COLUMN IF NOT EXISTS langues_chantees TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS statut_artiste   TEXT DEFAULT 'independant',     -- independant, signé, management, distribution, recherche_label
  ADD COLUMN IF NOT EXISTS banner_url       TEXT,
  -- Localisation (redondant avec profiles.localisation mais précis)
  ADD COLUMN IF NOT EXISTS ville            TEXT,
  ADD COLUMN IF NOT EXISTS pays             TEXT DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS telephone        TEXT,
  ADD COLUMN IF NOT EXISTS langues_parlees  TEXT[] DEFAULT '{}',
  -- Objectifs
  ADD COLUMN IF NOT EXISTS objectif_principal   TEXT,
  ADD COLUMN IF NOT EXISTS territoires          TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS disponible_audition  BOOLEAN DEFAULT TRUE,
  -- Statut juridique et droits
  ADD COLUMN IF NOT EXISTS statut_juridique     TEXT,
  ADD COLUMN IF NOT EXISTS sacem_membre         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sacem_numero         TEXT,
  ADD COLUMN IF NOT EXISTS droits_master        BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS droits_publishing    BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS distribution_contrat BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS label_actuel         TEXT,
  ADD COLUMN IF NOT EXISTS manager_actuel       TEXT,
  -- Parcours
  ADD COLUMN IF NOT EXISTS concerts_passes      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS presse               TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS playlists            TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prix_concours        TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certifications       TEXT[] DEFAULT '{}';

-- ================================================================
-- 2. EXTENSION TABLE profiles — champs communs manquants
-- ================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS telephone        TEXT,
  ADD COLUMN IF NOT EXISTS ville            TEXT,
  ADD COLUMN IF NOT EXISTS pays             TEXT DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS langues_parlees  TEXT[] DEFAULT '{}';

-- ================================================================
-- 3. TABLE artist_platform_accounts
-- Sources : api (OAuth/API officielle), import (CSV distributeur), manual (déclaré)
-- ================================================================

CREATE TABLE IF NOT EXISTS artist_platform_accounts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artiste_id            UUID NOT NULL REFERENCES artistes(id) ON DELETE CASCADE,
  platform              TEXT NOT NULL,         -- spotify, apple_music, deezer, youtube, soundcloud, tiktok, instagram, audiomack, bandcamp
  url                   TEXT,
  artist_id_on_platform TEXT,                  -- ID natif sur la plateforme (ex : Spotify artist ID)
  username              TEXT,
  -- Données clés (snapshot le plus récent)
  followers             INTEGER DEFAULT 0,
  popularity            SMALLINT DEFAULT 0,    -- 0-100, spécifique Spotify
  streams_declared      BIGINT DEFAULT 0,      -- streams déclarés (non API)
  -- Traçabilité
  data_source           TEXT NOT NULL DEFAULT 'manual', -- api | import | manual
  verified              BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at          TIMESTAMPTZ,
  sync_status           TEXT DEFAULT 'idle',   -- idle | syncing | ok | error
  sync_error            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(artiste_id, platform)
);

-- ================================================================
-- 4. TABLE artist_metrics_daily — historique journalier par plateforme
-- ================================================================

CREATE TABLE IF NOT EXISTS artist_metrics_daily (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artiste_id      UUID NOT NULL REFERENCES artistes(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  followers       INTEGER DEFAULT 0,
  streams         BIGINT DEFAULT 0,
  views           BIGINT DEFAULT 0,
  likes           INTEGER DEFAULT 0,
  shares          INTEGER DEFAULT 0,
  engagement_rate NUMERIC(6,4) DEFAULT 0,
  data_source     TEXT NOT NULL DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(artiste_id, platform, date)
);

-- ================================================================
-- 5. TABLE artist_tracks — catalogue
-- ================================================================

CREATE TABLE IF NOT EXISTS artist_tracks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artiste_id      UUID NOT NULL REFERENCES artistes(id) ON DELETE CASCADE,
  titre           TEXT NOT NULL,
  type            TEXT DEFAULT 'single',       -- single, ep, album, mixtape, feat
  isrc            TEXT,
  date_sortie     DATE,
  cover_url       TEXT,
  audio_url       TEXT,                        -- upload Supabase Storage
  audio_embed     TEXT,                        -- lien embed externe (SoundCloud, Spotify)
  -- Liens streaming
  spotify_url     TEXT,
  apple_music_url TEXT,
  deezer_url      TEXT,
  youtube_url     TEXT,
  soundcloud_url  TEXT,
  -- Crédits
  auteur          TEXT,
  compositeur     TEXT,
  producteur      TEXT,
  -- Meta
  prioritaire     BOOLEAN DEFAULT FALSE,
  streams_declares BIGINT DEFAULT 0,
  position        SMALLINT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 6. INDEX
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_platform_accounts_artiste ON artist_platform_accounts(artiste_id);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_artiste_date ON artist_metrics_daily(artiste_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_artiste ON artist_tracks(artiste_id, prioritaire DESC, position);

-- ================================================================
-- 7. TRIGGERS updated_at
-- ================================================================

CREATE TRIGGER IF NOT EXISTS trg_platform_accounts_updated
  BEFORE UPDATE ON artist_platform_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_tracks_updated
  BEFORE UPDATE ON artist_tracks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
-- 8. TRIGGER handle_new_user v2 — crée automatiquement le sous-profil
-- ================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_nom  TEXT;
BEGIN
  v_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'artiste'
  );
  v_nom := COALESCE(
    NEW.raw_user_meta_data->>'nom',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO profiles (id, email, nom, role)
  VALUES (NEW.id, NEW.email, v_nom, v_role)
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'artiste' THEN
    INSERT INTO artistes (profile_id, nom_artiste)
    VALUES (NEW.id, v_nom)
    ON CONFLICT (profile_id) DO NOTHING;

  ELSIF v_role = 'professionnel' THEN
    INSERT INTO professionnels (profile_id, nom_structure, type_structure, siret)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nom_structure', v_nom),
      COALESCE(NEW.raw_user_meta_data->>'type_structure', 'label'),
      NEW.raw_user_meta_data->>'siret'
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 9. RLS pour les nouvelles tables
-- ================================================================

ALTER TABLE artist_platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_metrics_daily     ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_tracks            ENABLE ROW LEVEL SECURITY;

-- platform_accounts : lecture publique, écriture par le propriétaire
CREATE POLICY "platform_accounts_select" ON artist_platform_accounts
  FOR SELECT USING (TRUE);

CREATE POLICY "platform_accounts_insert" ON artist_platform_accounts
  FOR INSERT WITH CHECK (
    artiste_id IN (SELECT id FROM artistes WHERE profile_id = auth.uid())
  );

CREATE POLICY "platform_accounts_update" ON artist_platform_accounts
  FOR UPDATE USING (
    artiste_id IN (SELECT id FROM artistes WHERE profile_id = auth.uid())
  );

-- metrics : lecture publique, écriture par le propriétaire
CREATE POLICY "metrics_select" ON artist_metrics_daily
  FOR SELECT USING (TRUE);

CREATE POLICY "metrics_insert" ON artist_metrics_daily
  FOR INSERT WITH CHECK (
    artiste_id IN (SELECT id FROM artistes WHERE profile_id = auth.uid())
  );

-- tracks : lecture publique, écriture par le propriétaire
CREATE POLICY "tracks_select" ON artist_tracks
  FOR SELECT USING (TRUE);

CREATE POLICY "tracks_insert" ON artist_tracks
  FOR INSERT WITH CHECK (
    artiste_id IN (SELECT id FROM artistes WHERE profile_id = auth.uid())
  );

CREATE POLICY "tracks_update" ON artist_tracks
  FOR UPDATE USING (
    artiste_id IN (SELECT id FROM artistes WHERE profile_id = auth.uid())
  );

CREATE POLICY "tracks_delete" ON artist_tracks
  FOR DELETE USING (
    artiste_id IN (SELECT id FROM artistes WHERE profile_id = auth.uid())
  );

-- ================================================================
-- FIN MIGRATION v2
-- ================================================================
