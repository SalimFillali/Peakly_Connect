-- ================================================================
-- PEAKLY — Schéma Supabase complet
-- Version 1.0 — Prêt pour la production
-- ================================================================
-- Exécuter ce fichier dans le SQL Editor de Supabase
-- Project Settings > SQL Editor > New query > Coller > Run
-- ================================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- 1. TYPES ÉNUMÉRÉS
-- ================================================================
CREATE TYPE user_role     AS ENUM ('artiste', 'professionnel', 'admin');
CREATE TYPE plan_type     AS ENUM ('gratuit', 'starter', 'pro', 'label');
CREATE TYPE sub_status    AS ENUM ('active', 'trialing', 'canceled', 'past_due', 'unpaid');
CREATE TYPE msg_status    AS ENUM ('sent', 'delivered', 'read');
CREATE TYPE notif_type    AS ENUM ('like', 'follow', 'message', 'candidature', 'system', 'badge');
CREATE TYPE cand_status   AS ENUM ('pending', 'vu', 'interesse', 'refuse', 'accepte');
CREATE TYPE media_type    AS ENUM ('audio', 'video', 'image', 'document');
CREATE TYPE post_type     AS ENUM ('publication', 'snippet', 'actu', 'recherche');

-- ================================================================
-- 2. PROFILS UTILISATEURS (extension de auth.users)
-- ================================================================
CREATE TABLE profiles (
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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 3. PROFILS ARTISTES
-- ================================================================
CREATE TABLE artistes (
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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- ================================================================
-- 4. PROFILS PROFESSIONNELS
-- ================================================================
CREATE TABLE professionnels (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nom_structure   TEXT NOT NULL,
  type_structure  TEXT NOT NULL, -- 'label', 'publisher', 'manager', 'booking', 'investor'
  siret           TEXT,
  kbis_url        TEXT,
  siret_verifie   BOOLEAN NOT NULL DEFAULT FALSE,
  description     TEXT,
  site_web        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- ================================================================
-- 5. ABONNEMENTS STRIPE
-- ================================================================
CREATE TABLE abonnements (
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
-- 6. PUBLICATIONS (feed social)
-- ================================================================
CREATE TABLE publications (
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
CREATE TABLE commentaires (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id  UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contenu         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 8. LIKES
-- ================================================================
CREATE TABLE likes (
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  publication_id  UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, publication_id)
);

-- ================================================================
-- 9. FOLLOWS
-- ================================================================
CREATE TABLE follows (
  follower_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ================================================================
-- 10. CONVERSATIONS & MESSAGES
-- ================================================================
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_1, participant_2),
  CHECK (participant_1 < participant_2) -- normalisation
);

CREATE TABLE messages (
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
CREATE TABLE notifications (
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
CREATE TABLE candidatures (
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
CREATE TABLE fichiers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nom             TEXT NOT NULL,
  url             TEXT NOT NULL,
  type            media_type NOT NULL,
  taille_bytes    BIGINT,
  duree_sec       INTEGER, -- pour audio/vidéo
  public          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 14. STATISTIQUES PLATEFORMES
-- ================================================================
CREATE TABLE stats_plateformes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artiste_id      UUID NOT NULL REFERENCES artistes(id) ON DELETE CASCADE,
  plateforme      TEXT NOT NULL, -- 'spotify', 'tiktok', 'soundcloud', etc.
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
CREATE TABLE badges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,
  nom             TEXT NOT NULL,
  description     TEXT,
  icone           TEXT,
  couleur         TEXT
);

CREATE TABLE badges_profils (
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id        UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  obtenu_le       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, badge_id)
);

-- ================================================================
-- 16. SCORING IA (historique)
-- ================================================================
CREATE TABLE scoring_ia (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artiste_id      UUID NOT NULL REFERENCES artistes(id) ON DELETE CASCADE,
  peakly_score    SMALLINT,
  virality_score  SMALLINT,
  momentum_score  SMALLINT,
  growth_score    SMALLINT,
  analyse         JSONB, -- détail de l'analyse IA
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 17. FAVORIS (pros qui sauvegardent des artistes)
-- ================================================================
CREATE TABLE favoris (
  pro_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  artiste_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pro_id, artiste_id)
);

-- ================================================================
-- 18. OFFRES (pros publient des auditions/opportunités)
-- ================================================================
CREATE TABLE offres (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pro_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titre           TEXT NOT NULL,
  description     TEXT,
  genre           TEXT,
  budget          TEXT,
  date_limite     DATE,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  candidatures_count INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 19. INDEX pour les performances
-- ================================================================
CREATE INDEX idx_publications_profile    ON publications(profile_id, created_at DESC);
CREATE INDEX idx_messages_conversation   ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_notifications_profile   ON notifications(profile_id, lue, created_at DESC);
CREATE INDEX idx_candidatures_artiste    ON candidatures(artiste_id, status);
CREATE INDEX idx_candidatures_pro        ON candidatures(pro_id, status);
CREATE INDEX idx_stats_artiste_date      ON stats_plateformes(artiste_id, date_mesure DESC);
CREATE INDEX idx_follows_following       ON follows(following_id);
CREATE INDEX idx_scoring_artiste         ON scoring_ia(artiste_id, computed_at DESC);
CREATE INDEX idx_offres_pro              ON offres(pro_id, active, created_at DESC);

-- ================================================================
-- 20. TRIGGERS — updated_at automatique
-- ================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_artistes_updated    BEFORE UPDATE ON artistes    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pros_updated        BEFORE UPDATE ON professionnels FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_publications_upd    BEFORE UPDATE ON publications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_candidatures_upd    BEFORE UPDATE ON candidatures FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_abonnements_upd     BEFORE UPDATE ON abonnements  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_offres_upd          BEFORE UPDATE ON offres       FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
-- 21. TRIGGER — auto-création profil à l'inscription
-- ================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'artiste')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================================
-- 22. TRIGGER — compteurs likes/comments (dénormalisation)
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

CREATE TRIGGER trg_likes_count AFTER INSERT OR DELETE ON likes FOR EACH ROW EXECUTE FUNCTION update_likes_count();

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

CREATE TRIGGER trg_comments_count AFTER INSERT OR DELETE ON commentaires FOR EACH ROW EXECUTE FUNCTION update_comments_count();
