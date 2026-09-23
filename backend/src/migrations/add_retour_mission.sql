-- ============================================================
-- MIGRATION : Retour de mission + kilométrage
-- psql -U postgres -d eclog -f add_retour_mission.sql
-- ============================================================

-- 1. Ajouter le statut 'terminee' à l'ENUM des demandes
ALTER TYPE demande_dep_statut ADD VALUE IF NOT EXISTS 'terminee';

-- 2. Colonnes kilométrage sur demande_deplacement
ALTER TABLE demande_deplacement
  ADD COLUMN IF NOT EXISTS km_depart             INTEGER,
  ADD COLUMN IF NOT EXISTS km_retour             INTEGER,
  ADD COLUMN IF NOT EXISTS date_retour_effective DATE,
  ADD COLUMN IF NOT EXISTS heure_retour_reel     TIME;

-- 3. Contrainte km_retour >= km_depart (si les deux sont renseignés)
ALTER TABLE demande_deplacement
  DROP CONSTRAINT IF EXISTS chk_km_coherence;
ALTER TABLE demande_deplacement
  ADD CONSTRAINT chk_km_coherence
    CHECK (km_retour IS NULL OR km_depart IS NULL OR km_retour >= km_depart);

-- Index pour accélérer les requêtes sur les missions terminées
CREATE INDEX IF NOT EXISTS idx_deplacement_terminee
  ON demande_deplacement(statut, date_retour_effective)
  WHERE statut = 'terminee';
