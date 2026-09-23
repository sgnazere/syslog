-- ============================================================
-- MIGRATION : Table services
-- À exécuter dans psql / pgAdmin si la table n'existe pas
-- psql -U postgres -d <votre_base> -f create_services.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS services (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(100) NOT NULL UNIQUE,
  date_creation TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Exemples de services (à adapter)
INSERT INTO services (nom) VALUES
  ('Administration'),
  ('Logistique'),
  ('Terrain'),
  ('Finance'),
  ('Ressources humaines'),
  ('Informatique'),
  ('Communication')
ON CONFLICT (nom) DO NOTHING;
