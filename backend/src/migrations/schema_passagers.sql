-- Table des passagers d'une demande de déplacement
-- À exécuter dans PostgreSQL si elle n'existe pas encore
CREATE TABLE IF NOT EXISTS demande_passagers (
  demande_id  INTEGER NOT NULL REFERENCES demande_deplacement(id) ON DELETE CASCADE,
  employe_id  INTEGER NOT NULL REFERENCES employees(id),
  PRIMARY KEY (demande_id, employe_id)
);

CREATE INDEX IF NOT EXISTS idx_demande_passagers_demande ON demande_passagers(demande_id);
CREATE INDEX IF NOT EXISTS idx_demande_passagers_employe ON demande_passagers(employe_id);
