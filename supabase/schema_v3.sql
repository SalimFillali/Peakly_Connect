/* ================================================================
   PEAKLY — Schema v3 : Extensions professionnelles
   Appliquer APRÈS schema_v2.sql
   ================================================================ */

-- ── 1. Extensions table professionnels ──────────────────────────
ALTER TABLE professionnels
  ADD COLUMN IF NOT EXISTS linkedin           TEXT,
  ADD COLUMN IF NOT EXISTS poste             TEXT,
  ADD COLUMN IF NOT EXISTS email_domaine     TEXT,
  ADD COLUMN IF NOT EXISTS pays_enreg        TEXT DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS taille_structure  TEXT,
  ADD COLUMN IF NOT EXISTS annee_creation    INTEGER,
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS kbis_url          TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_pro      TEXT,
  ADD COLUMN IF NOT EXISTS domaine_pro       TEXT,
  ADD COLUMN IF NOT EXISTS verification_level TEXT NOT NULL DEFAULT 'declare'
    CHECK (verification_level IN ('declare','email_verifie','pro_verifie','structure_verifiee','partenaire_certifie')),
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','in_review','approved','rejected')),
  ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visible_public    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepts_submissions BOOLEAN NOT NULL DEFAULT true;

-- ── 2. Préférences de recherche artistique ───────────────────────
CREATE TABLE IF NOT EXISTS professional_preferences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id              UUID NOT NULL REFERENCES professionnels(id) ON DELETE CASCADE,
  searched_genres     TEXT[] DEFAULT '{}',
  sous_genres         TEXT,
  searched_territories TEXT[] DEFAULT '{}',
  searched_languages  TEXT[] DEFAULT '{}',
  artist_levels       TEXT[] DEFAULT '{}',
  priority_platforms  TEXT[] DEFAULT '{}',
  min_followers       INTEGER NOT NULL DEFAULT 0,
  min_streams         INTEGER NOT NULL DEFAULT 0,
  min_growth_30d      NUMERIC(6,2) NOT NULL DEFAULT 0,
  min_engagement_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS professional_preferences_pro_id_idx
  ON professional_preferences(pro_id);

-- ── 3. Opportunités proposées ────────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_opportunities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id                UUID NOT NULL REFERENCES professionnels(id) ON DELETE CASCADE,
  objectives            TEXT[] DEFAULT '{}',
  deal_types            TEXT[] DEFAULT '{}',
  budget_range          TEXT NOT NULL DEFAULT 'non_public',
  availability          TEXT NOT NULL DEFAULT 'ouvert'
    CHECK (availability IN ('ouvert','veille','ferme','invitation')),
  nb_artists_sought     INTEGER,
  average_response_time TEXT,
  required_docs         TEXT[] DEFAULT '{}',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS professional_opportunities_pro_id_idx
  ON professional_opportunities(pro_id);

-- ── 4. Préférences de contact et publication ─────────────────────
CREATE TABLE IF NOT EXISTS professional_contact_prefs (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id                     UUID NOT NULL REFERENCES professionnels(id) ON DELETE CASCADE,
  contact_preference         TEXT NOT NULL DEFAULT 'message'
    CHECK (contact_preference IN ('message','email','appel')),
  receives_ia_recommendations BOOLEAN NOT NULL DEFAULT true,
  receives_talent_alerts      BOOLEAN NOT NULL DEFAULT true,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS professional_contact_prefs_pro_id_idx
  ON professional_contact_prefs(pro_id);

-- ── 5. Métriques de confiance (calculées côté serveur) ───────────
CREATE TABLE IF NOT EXISTS professional_trust_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id              UUID NOT NULL REFERENCES professionnels(id) ON DELETE CASCADE,
  response_rate       NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_response_hours  INTEGER NOT NULL DEFAULT 0,
  total_submissions   INTEGER NOT NULL DEFAULT 0,
  accepted_count      INTEGER NOT NULL DEFAULT 0,
  rejected_count      INTEGER NOT NULL DEFAULT 0,
  last_active_at      TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS professional_trust_metrics_pro_id_idx
  ON professional_trust_metrics(pro_id);

-- ── 6. RLS — activer sur toutes les nouvelles tables ─────────────
ALTER TABLE professional_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_opportunities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_contact_prefs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_trust_metrics  ENABLE ROW LEVEL SECURITY;

-- professional_preferences
CREATE POLICY "Lecture publique préférences pro"
  ON professional_preferences FOR SELECT USING (true);

CREATE POLICY "Écriture propre préférences pro"
  ON professional_preferences FOR ALL
  USING (pro_id IN (
    SELECT id FROM professionnels WHERE profile_id = auth.uid()
  ));

-- professional_opportunities
CREATE POLICY "Lecture publique opportunités pro"
  ON professional_opportunities FOR SELECT USING (true);

CREATE POLICY "Écriture propre opportunités pro"
  ON professional_opportunities FOR ALL
  USING (pro_id IN (
    SELECT id FROM professionnels WHERE profile_id = auth.uid()
  ));

-- professional_contact_prefs
CREATE POLICY "Lecture propre contact prefs"
  ON professional_contact_prefs FOR SELECT
  USING (pro_id IN (
    SELECT id FROM professionnels WHERE profile_id = auth.uid()
  ));

CREATE POLICY "Écriture propre contact prefs"
  ON professional_contact_prefs FOR ALL
  USING (pro_id IN (
    SELECT id FROM professionnels WHERE profile_id = auth.uid()
  ));

-- professional_trust_metrics
CREATE POLICY "Lecture publique métriques confiance"
  ON professional_trust_metrics FOR SELECT USING (true);

-- ── 7. Indexes utiles ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_professionnels_verification_level
  ON professionnels(verification_level);

CREATE INDEX IF NOT EXISTS idx_professionnels_visible
  ON professionnels(visible_public) WHERE visible_public = true;

CREATE INDEX IF NOT EXISTS idx_prof_pref_genres
  ON professional_preferences USING gin(searched_genres);

CREATE INDEX IF NOT EXISTS idx_prof_pref_territories
  ON professional_preferences USING gin(searched_territories);

-- ── 8. Trigger updated_at pour nouvelles tables ──────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_prof_pref_upd BEFORE UPDATE ON professional_preferences
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_prof_opp_upd BEFORE UPDATE ON professional_opportunities
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_prof_contact_upd BEFORE UPDATE ON professional_contact_prefs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_prof_trust_upd BEFORE UPDATE ON professional_trust_metrics
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
