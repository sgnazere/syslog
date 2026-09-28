-- ============================================================
-- 005 — Rôle super-administrateur
-- Droits d'un administrateur + gestion exclusive des licences
-- et des comptes super-administrateur.
-- ============================================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';
