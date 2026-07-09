-- ================================================================
-- PEAKLY — Row Level Security (RLS)
-- Exécuter APRÈS schema.sql
-- ================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE artistes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionnels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE commentaires      ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows           ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidatures      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichiers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_plateformes ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges_profils    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_ia        ENABLE ROW LEVEL SECURITY;
ALTER TABLE favoris           ENABLE ROW LEVEL SECURITY;
ALTER TABLE offres            ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- PROFILES
-- ================================================================
CREATE POLICY "profiles_public_read"   ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_own_write"     ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all"     ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ================================================================
-- ARTISTES
-- ================================================================
CREATE POLICY "artistes_public_read"   ON artistes FOR SELECT USING (TRUE);
CREATE POLICY "artistes_own_write"     ON artistes FOR ALL USING (profile_id = auth.uid());

-- ================================================================
-- PROFESSIONNELS
-- ================================================================
CREATE POLICY "pros_public_read"       ON professionnels FOR SELECT USING (TRUE);
CREATE POLICY "pros_own_write"         ON professionnels FOR ALL USING (profile_id = auth.uid());

-- ================================================================
-- ABONNEMENTS — privé par utilisateur
-- ================================================================
CREATE POLICY "abos_own_read"          ON abonnements FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "abos_service_write"     ON abonnements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ================================================================
-- PUBLICATIONS
-- ================================================================
CREATE POLICY "pubs_public_read"       ON publications FOR SELECT USING (TRUE);
CREATE POLICY "pubs_own_write"         ON publications FOR ALL USING (profile_id = auth.uid());

-- ================================================================
-- COMMENTAIRES
-- ================================================================
CREATE POLICY "comments_public_read"   ON commentaires FOR SELECT USING (TRUE);
CREATE POLICY "comments_own_write"     ON commentaires FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "comments_own_delete"    ON commentaires FOR DELETE USING (profile_id = auth.uid());

-- ================================================================
-- LIKES
-- ================================================================
CREATE POLICY "likes_public_read"      ON likes FOR SELECT USING (TRUE);
CREATE POLICY "likes_own_write"        ON likes FOR ALL USING (profile_id = auth.uid());

-- ================================================================
-- FOLLOWS
-- ================================================================
CREATE POLICY "follows_public_read"    ON follows FOR SELECT USING (TRUE);
CREATE POLICY "follows_own_write"      ON follows FOR ALL USING (follower_id = auth.uid());

-- ================================================================
-- CONVERSATIONS — visibles uniquement par les participants
-- ================================================================
CREATE POLICY "convs_participant_read" ON conversations FOR SELECT USING (
  participant_1 = auth.uid() OR participant_2 = auth.uid()
);
CREATE POLICY "convs_participant_write" ON conversations FOR INSERT WITH CHECK (
  participant_1 = auth.uid() OR participant_2 = auth.uid()
);

-- ================================================================
-- MESSAGES — visibles uniquement par les participants
-- ================================================================
CREATE POLICY "msgs_participant_read"  ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);
CREATE POLICY "msgs_own_write"         ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- ================================================================
-- NOTIFICATIONS — privé
-- ================================================================
CREATE POLICY "notifs_own_read"        ON notifications FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "notifs_service_write"   ON notifications FOR INSERT WITH CHECK (TRUE); -- via service role

-- ================================================================
-- CANDIDATURES
-- ================================================================
CREATE POLICY "cands_artiste_read"     ON candidatures FOR SELECT USING (
  artiste_id = auth.uid() OR pro_id = auth.uid()
);
CREATE POLICY "cands_artiste_write"    ON candidatures FOR INSERT WITH CHECK (artiste_id = auth.uid());
CREATE POLICY "cands_pro_update"       ON candidatures FOR UPDATE USING (pro_id = auth.uid());

-- ================================================================
-- FICHIERS — public si public=TRUE, sinon propriétaire
-- ================================================================
CREATE POLICY "fichiers_public_read"   ON fichiers FOR SELECT USING (public = TRUE OR profile_id = auth.uid());
CREATE POLICY "fichiers_own_write"     ON fichiers FOR ALL USING (profile_id = auth.uid());

-- ================================================================
-- STATS — artiste = soi uniquement, pros peuvent lire
-- ================================================================
CREATE POLICY "stats_own_read"         ON stats_plateformes FOR SELECT USING (
  EXISTS (SELECT 1 FROM artistes a WHERE a.id = stats_plateformes.artiste_id AND a.profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('professionnel', 'admin'))
);
CREATE POLICY "stats_service_write"    ON stats_plateformes FOR INSERT WITH CHECK (TRUE); -- via service role

-- ================================================================
-- SCORING IA — artiste soi + pros
-- ================================================================
CREATE POLICY "scoring_read"           ON scoring_ia FOR SELECT USING (
  EXISTS (SELECT 1 FROM artistes a WHERE a.id = scoring_ia.artiste_id AND a.profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('professionnel', 'admin'))
);

-- ================================================================
-- FAVORIS — pros uniquement
-- ================================================================
CREATE POLICY "favoris_own"            ON favoris FOR ALL USING (pro_id = auth.uid());

-- ================================================================
-- OFFRES — lecture publique, écriture pro seulement
-- ================================================================
CREATE POLICY "offres_public_read"     ON offres FOR SELECT USING (active = TRUE);
CREATE POLICY "offres_pro_write"       ON offres FOR ALL USING (pro_id = auth.uid());

-- ================================================================
-- BADGES — lecture publique
-- ================================================================
CREATE POLICY "badges_public_read"     ON badges_profils FOR SELECT USING (TRUE);
