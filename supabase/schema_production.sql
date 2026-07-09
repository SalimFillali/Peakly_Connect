-- ================================================================
-- PEAKLY -- Schema production complet
-- Executer une SEULE fois dans Supabase SQL Editor
-- Combine schema.sql + schema_v2.sql + schema_v3.sql + policies.sql
-- dans l'ordre correct, avec deduplication et idempotence.
-- ================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- 1. TYPES ENUMERES
-- ================================================================
DO $$ BEGIN
  CREATE TYPE user_role   AS ENUM ('artiste', 'professionnel', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_type   AS ENUM ('gratuit', 'starter', 'pro', 'label');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sub_status  AS ENUM ('active', 'trialing', 'canceled', 'past_due', 'unpaid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE msg_status  AS ENUM ('sent', 'delivered', 'read');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notif_type  AS ENUM ('like', 'follow', 'message', 'candidature', 'system', 'badge');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cand_status AS ENUM ('pending', 'vu', 'interesse', 'refuse', 'accepte');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE media_type  AS ENUM ('audio', 'video', 'image', 'document');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE post_type   AS ENUM ('publication', 'snippet', 'actu', 'recherche');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- 2. PROFILS UTILISATEURS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'artiste',
  nom             TEXT NOT NULL,
  email           TEXT NOT NULL,
  avatar_url      TEXT,
  bio             TEXT,
  localisation    TEXT,
  site_web        TEXT,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  premium         BOOLEAN NOT NULL DEFAULT FALSE,
  plan            plan_type NOT NULL DEFAULT 'gratuit',
  stripe_customer_id TEXT,
  onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
  telephone       TEXT,
  ville           TEXT,
  pays            TEXT DEFAULT 'France',
  langues_parlees TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 3. PROFILS ARTISTES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.artistes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nom_artiste     TEXT NOT NULL,
  genre_principal TEXT,
  genres          TEXT[] DEFAULT '{}',
  influences      TEXT[] DEFAULT '{}',
  biographie      TEXT,
  peakly_score    SMALLINT DEFAULT 0 CHECK (peakly_score BETWEEN 0 AND 100),
  virality_score  SMALLINT DEFAULT 0 CHECK (virality_score BETWEEN 0 AND 100),
  momentum_score  SMALLINT DEFAULT 0 CHECK (momentum_score BETWEEN 0 AND 100),
  growth_score    SMALLINT DEFAULT 0 CHECK (growth_score BETWEEN 0 AND 100),
  streams_total   BIGINT DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  top_pct_france  NUMERIC(5,2),
  fenetre_signature TEXT,
  -- Champs v2
  type_artiste       TEXT DEFAULT 'solo',
  bio_courte         TEXT,
  bio_pro            TEXT,
  sous_genres        TEXT[] DEFAULT '{}',
  mood               TEXT[] DEFAULT '{}',
  competences        TEXT[] DEFAULT '{}',
  langues_chantees   TEXT[] DEFAULT '{}',
  statut_artiste     TEXT DEFAULT 'independant',
  banner_url         TEXT,
  ville              TEXT,
  pays               TEXT DEFAULT 'France',
  telephone          TEXT,
  langues_parlees    TEXT[] DEFAULT '{}',
  objectif_principal TEXT,
  territoires        TEXT[] DEFAULT '{}',
  disponible_audition BOOLEAN DEFAULT TRUE,
  statut_juridique   TEXT,
  sacem_membre       BOOLEAN DEFAULT FALSE,
  sacem_numero       TEXT,
  droits_master      BOOLEAN DEFAULT TRUE,
  droits_publishing  BOOLEAN DEFAULT TRUE,
  distribution_contrat BOOLEAN DEFAULT FALSE,
  label_actuel       TEXT,
  manager_actuel     TEXT,
  concerts_passes    INTEGER DEFAULT 0,
  presse             TEXT[] DEFAULT '{}',
  playlists          TEXT[] DEFAULT '{}',
  prix_concours      TEXT[] DEFAULT '{}',
  certifications     TEXT[] DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- ================================================================
-- 4. PROFILS PROFESSIONNELS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.professionnels (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nom_structure   TEXT NOT NULL,
  type_structure  TEXT NOT NULL,
  siret           TEXT,
  kbis_url        TEXT,
  siret_verifie   BOOLEAN NOT NULL DEFAULT FALSE,
  description     TEXT,
  site_web        TEXT,
  -- Champs v3
  linkedin            TEXT,
  poste               TEXT,
  email_domaine       TEXT,
  pays_enreg          TEXT DEFAULT 'France',
  taille_structure    TEXT,
  annee_creation      INTEGER,
  logo_url            TEXT,
  linkedin_pro        TEXT,
  domaine_pro         TEXT,
  verification_level  TEXT NOT NULL DEFAULT 'declare'
    CHECK (verification_level IN ('declare','email_verifie','pro_verifie','structure_verifiee','partenaire_certifie')),
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','in_review','approved','rejected')),
  verification_requested_at TIMESTAMPTZ,
  verification_completed_at TIMESTAMPTZ,
  visible_public      BOOLEAN NOT NULL DEFAULT true,
  accepts_submissions BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- ================================================================
-- 5. ABONNEMENTS STRIPE (table historique)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.abonnements (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id       TEXT,
  plan                  plan_type NOT NULL DEFAULT 'gratuit',
  status                sub_status NOT NULL DEFAULT 'active',
  trial_end             TIMESTAMPTZ,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- ================================================================
-- 5b. TABLE SUBSCRIPTIONS (pour le webhook simplifie)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan                   TEXT NOT NULL DEFAULT 'free',
  status                 TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- 6. PUBLICATIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.publications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            post_type NOT NULL DEFAULT 'publication',
  contenu         TEXT NOT NULL,
  media_url       TEXT,
  media_type      media_type,
  tags            TEXT[] DEFAULT '{}',
  likes_count     INTEGER NOT NULL DEFAULT 0,
  comments_count  INTEGER NOT NULL DEFAULT 0,
  shares_count    INTEGER NOT NULL DEFAULT 0,
  pinned          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 7. COMMENTAIRES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.commentaires (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id  UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contenu         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 8. LIKES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.likes (
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  publication_id  UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, publication_id)
);

-- ================================================================
-- 9. FOLLOWS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ================================================================
-- 10. CONVERSATIONS & MESSAGES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_1, participant_2),
  CHECK (participant_1 < participant_2)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contenu         TEXT NOT NULL,
  media_url       TEXT,
  media_type      media_type,
  status          msg_status NOT NULL DEFAULT 'sent',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 11. NOTIFICATIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            notif_type NOT NULL,
  titre           TEXT NOT NULL,
  contenu         TEXT,
  lien            TEXT,
  from_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lue             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 12. CANDIDATURES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.candidatures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artiste_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pro_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offre_titre     TEXT NOT NULL,
  message         TEXT,
  media_url       TEXT,
  status          cand_status NOT NULL DEFAULT 'pending',
  note_pro        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 13. FICHIERS MEDIA
-- ================================================================
CREATE TABLE IF NOT EXISTS public.fichiers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nom             TEXT NOT NULL,
  url             TEXT NOT NULL,
  type            media_type NOT NULL,
  taille_bytes    BIGINT,
  duree_sec       INTEGER,
  public          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 14. STATISTIQUES PLATEFORMES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.stats_plateformes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artiste_id      UUID NOT NULL REFERENCES artistes(id) ON DELETE CASCADE,
  plateforme      TEXT NOT NULL,
  streams         BIGINT DEFAULT 0,
  followers       INTEGER DEFAULT 0,
  views           BIGINT DEFAULT 0,
  likes           INTEGER DEFAULT 0,
  partages        INTEGER DEFAULT 0,
  date_mesure     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(artiste_id, plateforme, date_mesure)
);

-- ================================================================
-- 15. BADGES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,
  nom         TEXT NOT NULL,
  description TEXT,
  icone       TEXT,
  couleur     TEXT
);

CREATE TABLE IF NOT EXISTS public.badges_profils (
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  obtenu_le   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, badge_id)
);

-- ================================================================
-- 16. SCORING IA
-- ================================================================
CREATE TABLE IF NOT EXISTS public.scoring_ia (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artiste_id      UUID NOT NULL REFERENCES artistes(id) ON DELETE CASCADE,
  peakly_score    SMALLINT,
  virality_score  SMALLINT,
  momentum_score  SMALLINT,
  growth_score    SMALLINT,
  analyse         JSONB,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 17. FAVORIS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.favoris (
  pro_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  artiste_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pro_id, artiste_id)
);

-- ================================================================
-- 18. OFFRES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.offres (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pro_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titre              TEXT NOT NULL,
  description        TEXT,
  genre              TEXT,
  budget             TEXT,
  date_limite        DATE,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  candidatures_count INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 19. COMPTES PLATEFORMES ARTISTE (v2)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.artist_platform_accounts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artiste_id            UUID NOT NULL REFERENCES artistes(id) ON DELETE CASCADE,
  platform              TEXT NOT NULL,
  url                   TEXT,
  artist_id_on_platform TEXT,
  username              TEXT,
  followers             INTEGER DEFAULT 0,
  popularity            SMALLINT DEFAULT 0,
  streams_declared      BIGINT DEFAULT 0,
  data_source           TEXT NOT NULL DEFAULT 'manual',
  verified              BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at          TIMESTAMPTZ,
  sync_status           TEXT DEFAULT 'idle',
  sync_error            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(artiste_id, platform)
);

-- ================================================================
-- 20. METRIQUES JOURNALIERES (v2)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.artist_metrics_daily (
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
-- 21. CATALOGUE ARTISTE (v2)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.artist_tracks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artiste_id       UUID NOT NULL REFERENCES artistes(id) ON DELETE CASCADE,
  titre            TEXT NOT NULL,
  type             TEXT DEFAULT 'single',
  isrc             TEXT,
  date_sortie      DATE,
  cover_url        TEXT,
  audio_url        TEXT,
  audio_embed      TEXT,
  spotify_url      TEXT,
  apple_music_url  TEXT,
  deezer_url       TEXT,
  youtube_url      TEXT,
  soundcloud_url   TEXT,
  auteur           TEXT,
  compositeur      TEXT,
  producteur       TEXT,
  prioritaire      BOOLEAN DEFAULT FALSE,
  streams_declares BIGINT DEFAULT 0,
  position         SMALLINT DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 22. PREFERENCES PROFESSIONNELS (v3)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.professional_preferences (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id               UUID NOT NULL REFERENCES professionnels(id) ON DELETE CASCADE,
  searched_genres      TEXT[] DEFAULT '{}',
  sous_genres          TEXT,
  searched_territories TEXT[] DEFAULT '{}',
  searched_languages   TEXT[] DEFAULT '{}',
  artist_levels        TEXT[] DEFAULT '{}',
  priority_platforms   TEXT[] DEFAULT '{}',
  min_followers        INTEGER NOT NULL DEFAULT 0,
  min_streams          INTEGER NOT NULL DEFAULT 0,
  min_growth_30d       NUMERIC(6,2) NOT NULL DEFAULT 0,
  min_engagement_rate  NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS professional_preferences_pro_id_idx ON professional_preferences(pro_id);

-- ================================================================
-- 23. OPPORTUNITES PROFESSIONNELS (v3)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.professional_opportunities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id              UUID NOT NULL REFERENCES professionnels(id) ON DELETE CASCADE,
  objectives          TEXT[] DEFAULT '{}',
  deal_types          TEXT[] DEFAULT '{}',
  budget_range        TEXT NOT NULL DEFAULT 'non_public',
  availability        TEXT NOT NULL DEFAULT 'ouvert'
    CHECK (availability IN ('ouvert','veille','ferme','invitation')),
  nb_artists_sought   INTEGER,
  average_response_time TEXT,
  required_docs       TEXT[] DEFAULT '{}',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS professional_opportunities_pro_id_idx ON professional_opportunities(pro_id);

-- ================================================================
-- 24. PREFS CONTACT PROFESSIONNELS (v3)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.professional_contact_prefs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id                      UUID NOT NULL REFERENCES professionnels(id) ON DELETE CASCADE,
  contact_preference          TEXT NOT NULL DEFAULT 'message'
    CHECK (contact_preference IN ('message','email','appel')),
  receives_ia_recommendations BOOLEAN NOT NULL DEFAULT true,
  receives_talent_alerts      BOOLEAN NOT NULL DEFAULT true,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS professional_contact_prefs_pro_id_idx ON professional_contact_prefs(pro_id);

-- ================================================================
-- 25. METRIQUES CONFIANCE PROFESSIONNELS (v3)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.professional_trust_metrics (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id             UUID NOT NULL REFERENCES professionnels(id) ON DELETE CASCADE,
  response_rate      NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_response_hours INTEGER NOT NULL DEFAULT 0,
  total_submissions  INTEGER NOT NULL DEFAULT 0,
  accepted_count     INTEGER NOT NULL DEFAULT 0,
  rejected_count     INTEGER NOT NULL DEFAULT 0,
  last_active_at     TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS professional_trust_metrics_pro_id_idx ON professional_trust_metrics(pro_id);

-- ================================================================
-- 26. INDEX PERFORMANCES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_publications_profile   ON publications(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation  ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_profile  ON notifications(profile_id, lue, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidatures_artiste   ON candidatures(artiste_id, status);
CREATE INDEX IF NOT EXISTS idx_candidatures_pro       ON candidatures(pro_id, status);
CREATE INDEX IF NOT EXISTS idx_stats_artiste_date     ON stats_plateformes(artiste_id, date_mesure DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following      ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_scoring_artiste        ON scoring_ia(artiste_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_offres_pro             ON offres(pro_id, active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_accounts_artiste   ON artist_platform_accounts(artiste_id);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_artiste_date  ON artist_metrics_daily(artiste_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_artiste              ON artist_tracks(artiste_id, prioritaire DESC, position);
CREATE INDEX IF NOT EXISTS idx_professionnels_verification_level ON professionnels(verification_level);
CREATE INDEX IF NOT EXISTS idx_professionnels_visible      ON professionnels(visible_public) WHERE visible_public = true;
CREATE INDEX IF NOT EXISTS idx_prof_pref_genres            ON professional_preferences USING gin(searched_genres);
CREATE INDEX IF NOT EXISTS idx_prof_pref_territories       ON professional_preferences USING gin(searched_territories);

-- ================================================================
-- 27. FONCTION updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ================================================================
-- 28. TRIGGERS updated_at
-- ================================================================
DO $$ BEGIN
  CREATE TRIGGER trg_profiles_updated    BEFORE UPDATE ON profiles        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_artistes_updated    BEFORE UPDATE ON artistes        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_pros_updated        BEFORE UPDATE ON professionnels  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_publications_upd   BEFORE UPDATE ON publications     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_candidatures_upd   BEFORE UPDATE ON candidatures     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_abonnements_upd    BEFORE UPDATE ON abonnements      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_offres_upd         BEFORE UPDATE ON offres           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_platform_accounts_updated BEFORE UPDATE ON artist_platform_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_tracks_updated     BEFORE UPDATE ON artist_tracks    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_prof_pref_upd     BEFORE UPDATE ON professional_preferences   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_prof_opp_upd      BEFORE UPDATE ON professional_opportunities FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_prof_contact_upd  BEFORE UPDATE ON professional_contact_prefs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_prof_trust_upd    BEFORE UPDATE ON professional_trust_metrics  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- 29. TRIGGER handle_new_user v2
-- ================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_nom  TEXT;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'artiste');
  v_nom  := COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1));

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

DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- 30. TRIGGERS compteurs likes/commentaires
-- ================================================================
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE publications SET likes_count = likes_count + 1 WHERE id = NEW.publication_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE publications SET likes_count = likes_count - 1 WHERE id = OLD.publication_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_likes_count AFTER INSERT OR DELETE ON likes FOR EACH ROW EXECUTE FUNCTION update_likes_count();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE publications SET comments_count = comments_count + 1 WHERE id = NEW.publication_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE publications SET comments_count = comments_count - 1 WHERE id = OLD.publication_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_comments_count AFTER INSERT OR DELETE ON commentaires FOR EACH ROW EXECUTE FUNCTION update_comments_count();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- 31. RLS -- activer sur toutes les tables
-- ================================================================
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artistes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionnels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonnements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commentaires            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatures            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichiers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stats_plateformes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges_profils          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_ia              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoris                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offres                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_metrics_daily    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_tracks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_preferences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_contact_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_trust_metrics ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 32. POLITIQUES RLS
-- ================================================================

-- Profiles
CREATE POLICY "profiles_public_read"  ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_own_write"    ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all"    ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Artistes
CREATE POLICY "artistes_public_read" ON artistes FOR SELECT USING (TRUE);
CREATE POLICY "artistes_own_write"   ON artistes FOR ALL USING (profile_id = auth.uid());

-- Professionnels
CREATE POLICY "pros_public_read"     ON professionnels FOR SELECT USING (TRUE);
CREATE POLICY "pros_own_write"       ON professionnels FOR ALL USING (profile_id = auth.uid());

-- Abonnements
CREATE POLICY "abos_own_read"        ON abonnements FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "abos_service_write"   ON abonnements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Subscriptions
CREATE POLICY "Users can read own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages subscriptions" ON subscriptions USING (true) WITH CHECK (true);

-- Publications
CREATE POLICY "pubs_public_read"     ON publications FOR SELECT USING (TRUE);
CREATE POLICY "pubs_own_write"       ON publications FOR ALL USING (profile_id = auth.uid());

-- Commentaires
CREATE POLICY "comments_public_read" ON commentaires FOR SELECT USING (TRUE);
CREATE POLICY "comments_own_write"   ON commentaires FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "comments_own_delete"  ON commentaires FOR DELETE USING (profile_id = auth.uid());

-- Likes
CREATE POLICY "likes_public_read"    ON likes FOR SELECT USING (TRUE);
CREATE POLICY "likes_own_write"      ON likes FOR ALL USING (profile_id = auth.uid());

-- Follows
CREATE POLICY "follows_public_read"  ON follows FOR SELECT USING (TRUE);
CREATE POLICY "follows_own_write"    ON follows FOR ALL USING (follower_id = auth.uid());

-- Conversations
CREATE POLICY "convs_participant_read" ON conversations FOR SELECT USING (
  participant_1 = auth.uid() OR participant_2 = auth.uid()
);
CREATE POLICY "convs_participant_write" ON conversations FOR INSERT WITH CHECK (
  participant_1 = auth.uid() OR participant_2 = auth.uid()
);

-- Messages
CREATE POLICY "msgs_participant_read" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
);
CREATE POLICY "msgs_own_write"        ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Notifications
CREATE POLICY "notifs_own_read"      ON notifications FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "notifs_service_write" ON notifications FOR INSERT WITH CHECK (TRUE);

-- Candidatures
CREATE POLICY "cands_artiste_read"   ON candidatures FOR SELECT USING (artiste_id = auth.uid() OR pro_id = auth.uid());
CREATE POLICY "cands_artiste_write"  ON candidatures FOR INSERT WITH CHECK (artiste_id = auth.uid());
CREATE POLICY "cands_pro_update"     ON candidatures FOR UPDATE USING (pro_id = auth.uid());

-- Fichiers
CREATE POLICY "fichiers_public_read" ON fichiers FOR SELECT USING (public = TRUE OR profile_id = auth.uid());
CREATE POLICY "fichiers_own_write"   ON fichiers FOR ALL USING (profile_id = auth.uid());

-- Stats plateformes
CREATE POLICY "stats_own_read"       ON stats_plateformes FOR SELECT USING (
  EXISTS (SELECT 1 FROM artistes a WHERE a.id = stats_plateformes.artiste_id AND a.profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('professionnel', 'admin'))
);
CREATE POLICY "stats_service_write"  ON stats_plateformes FOR INSERT WITH CHECK (TRUE);

-- Scoring IA
CREATE POLICY "scoring_read"         ON scoring_ia FOR SELECT USING (
  EXISTS (SELECT 1 FROM artistes a WHERE a.id = scoring_ia.artiste_id AND a.profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('professionnel', 'admin'))
);

-- Favoris
CREATE POLICY "favoris_own"          ON favoris FOR ALL USING (pro_id = auth.uid());

-- Offres
CREATE POLICY "offres_public_read"   ON offres FOR SELECT USING (active = TRUE);
CREATE POLICY "offres_pro_write"     ON offres FOR ALL USING (pro_id = auth.uid());

-- Badges
CREATE POLICY "badges_public_read"   ON badges_profils FOR SELECT USING (TRUE);

-- Artist platform accounts
CREATE POLICY "platform_accounts_select" ON artist_platform_accounts FOR SELECT USING (TRUE);
CREATE POLICY "platform_accounts_insert" ON artist_platform_accounts FOR INSERT WITH CHECK (
  artiste_id IN (SELECT id FROM artistes WHERE profile_id = auth.uid())
);
CREATE POLICY "platform_accounts_update" ON artist_platform_accounts FOR UPDATE USING (
  artiste_id IN (SELECT id FROM artistes WHERE profile_id = auth.uid())
);

-- Artist metrics
CREATE POLICY "metrics_select" ON artist_metrics_daily FOR SELECT USING (TRUE);
CREATE POLICY "metrics_insert" ON artist_metrics_daily FOR INSERT WITH CHECK (
  artiste_id IN (SELECT id FROM artistes WHERE profile_id = auth.uid())
);

-- Artist tracks
CREATE POLICY "tracks_select" ON artist_tracks FOR SELECT USING (TRUE);
CREATE POLICY "tracks_insert" ON artist_tracks FOR INSERT WITH CHECK (
  artiste_id IN (SELECT id FROM artistes WHERE profile_id = auth.uid())
);
CREATE POLICY "tracks_update" ON artist_tracks FOR UPDATE USING (
  artiste_id IN (SELECT id FROM artistes WHERE profile_id = auth.uid())
);
CREATE POLICY "tracks_delete" ON artist_tracks FOR DELETE USING (
  artiste_id IN (SELECT id FROM artistes WHERE profile_id = auth.uid())
);

-- Professional preferences
CREATE POLICY "Lecture publique preferences pro" ON professional_preferences FOR SELECT USING (true);
CREATE POLICY "Ecriture propre preferences pro"  ON professional_preferences FOR ALL USING (
  pro_id IN (SELECT id FROM professionnels WHERE profile_id = auth.uid())
);

-- Professional opportunities
CREATE POLICY "Lecture publique opportunites pro" ON professional_opportunities FOR SELECT USING (true);
CREATE POLICY "Ecriture propre opportunites pro"  ON professional_opportunities FOR ALL USING (
  pro_id IN (SELECT id FROM professionnels WHERE profile_id = auth.uid())
);

-- Professional contact prefs
CREATE POLICY "Lecture propre contact prefs" ON professional_contact_prefs FOR SELECT USING (
  pro_id IN (SELECT id FROM professionnels WHERE profile_id = auth.uid())
);
CREATE POLICY "Ecriture propre contact prefs" ON professional_contact_prefs FOR ALL USING (
  pro_id IN (SELECT id FROM professionnels WHERE profile_id = auth.uid())
);

-- Professional trust metrics
CREATE POLICY "Lecture publique metriques confiance" ON professional_trust_metrics FOR SELECT USING (true);

-- ================================================================
-- FIN schema_production.sql
-- ================================================================
