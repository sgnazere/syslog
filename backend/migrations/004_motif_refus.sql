-- ============================================================
-- 004 — Conservation du motif de refus d'une demande
-- ============================================================
ALTER TABLE demande_deplacement ADD COLUMN IF NOT EXISTS motif_refus TEXT;
