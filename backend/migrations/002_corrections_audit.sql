-- ============================================================
-- 002 — Corrections issues de l'audit de septembre 2026
-- ============================================================

-- ── Demandes multi-destinations : une demande, plusieurs communes ──
-- demande_deplacement.commune_id reste la destination principale (1re commune).
CREATE TABLE IF NOT EXISTS demande_communes (
  demande_id INTEGER  NOT NULL REFERENCES demande_deplacement(id) ON DELETE CASCADE,
  commune_id INTEGER  NOT NULL REFERENCES communes(id),
  ordre      SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (demande_id, commune_id)
);
CREATE INDEX IF NOT EXISTS idx_demande_communes_commune ON demande_communes(commune_id);

INSERT INTO demande_communes (demande_id, commune_id, ordre)
SELECT id, commune_id, 1 FROM demande_deplacement
ON CONFLICT DO NOTHING;

-- ── Notifications internes ───────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  message    TEXT         NOT NULL,
  type       VARCHAR(20)  NOT NULL DEFAULT 'info'
             CHECK (type IN ('info', 'success', 'warning', 'error')),
  read       BOOLEAN      NOT NULL DEFAULT false,
  request_id INTEGER      REFERENCES demande_deplacement(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- ── Jours fériés ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS holidays (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  date       DATE         NOT NULL UNIQUE,
  recurring  BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Lien explicite compte ↔ fiche employé (remplace le lien par e-mail) ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id INTEGER;
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee ON users(employee_id) WHERE employee_id IS NOT NULL;

UPDATE users u
SET employee_id = e.id
FROM employees e
WHERE u.employee_id IS NULL
  AND e.email IS NOT NULL
  AND LOWER(e.email) = LOWER(u.email)
  AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.employee_id = e.id);

-- ── Changement de mot de passe obligatoire après création / réinitialisation ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- ── Journal d'audit : conserver l'historique si un compte est supprimé ──
ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Purge des mots de passe enregistrés en clair par l'ancien middleware d'audit
UPDATE audit_logs
SET details = regexp_replace(
  details,
  '"(password|newPassword|currentPassword|cle|token)"\s*:\s*"([^"\\]|\\.)*"?',
  '"\1":"[masqué]"',
  'g')
WHERE details ~ '"(password|newPassword|currentPassword|cle|token)"\s*:';

-- ── Trigger de capacité sans effet (le contrôle est fait par l'API) ──
DROP TRIGGER IF EXISTS check_vehicule_capacity ON demande_deplacement;
DROP FUNCTION IF EXISTS fn_check_vehicule_capacity();

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_deplacement_employe   ON demande_deplacement(employe_id);
CREATE INDEX IF NOT EXISTS idx_deplacement_vehicule  ON demande_deplacement(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_deplacement_chauffeur ON demande_deplacement(chauffeur_id);
CREATE INDEX IF NOT EXISTS idx_deplacement_commune   ON demande_deplacement(commune_id, date_deplacement);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicule  ON maintenance_vehicules(vehicule_id);
-- Doublons d'index uniques déjà assurés par les contraintes UNIQUE
DROP INDEX IF EXISTS idx_user_email;
DROP INDEX IF EXISTS idx_sessions_token;
