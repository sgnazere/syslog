-- ============================================================
-- 001 — Schéma initial SYSLOG (reconstitué depuis la base de référence)
-- Idempotent : peut être appliqué sur une base vide ou sur une base
-- existante déjà conforme.
-- ============================================================

-- ── Types énumérés ───────────────────────────────────────────
DO $$ BEGIN CREATE TYPE user_role          AS ENUM ('admin', 'manager', 'user');                                        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employee_status    AS ENUM ('actif', 'inactif');                                                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE vehicule_statut    AS ENUM ('disponible', 'en_mission', 'en_maintenance', 'hors_service');      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE vehicule_energie   AS ENUM ('Diesel', 'Essence');                                               EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE chauffeur_statut   AS ENUM ('disponible', 'en_mission', 'indisponible');                        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE demande_dep_statut AS ENUM ('en_attente', 'validee', 'refusee', 'terminee');                    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE maintenance_statut AS ENUM ('planifiee', 'en_cours', 'terminee');                               EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Fonctions de trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_update_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION fn_update_date_modification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.date_modification = CURRENT_TIMESTAMP;
  RETURN NEW;
END $$;

-- Un employé ne peut pas avoir plusieurs demandes actives à la même date
CREATE OR REPLACE FUNCTION fn_check_employee_duplicate_requests() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  existing_requests INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_requests
  FROM demande_deplacement
  WHERE employe_id       = NEW.employe_id
    AND date_deplacement = NEW.date_deplacement
    AND statut          != 'refusee';

  IF existing_requests > 0 THEN
    RAISE EXCEPTION 'Un employé ne peut pas avoir plusieurs demandes pour la même date'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

-- ── Référentiels ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id         SERIAL PRIMARY KEY,
  nom        VARCHAR(100) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS communes (
  id         SERIAL PRIMARY KEY,
  nom        VARCHAR(100) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS districts (
  id         SERIAL PRIMARY KEY,
  nom        VARCHAR(100) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Personnes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  nom               VARCHAR(100) NOT NULL,
  prenom            VARCHAR(100) NOT NULL,
  email             VARCHAR(100) NOT NULL UNIQUE,
  password          VARCHAR(255) NOT NULL,
  role              user_role    NOT NULL DEFAULT 'user',
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  last_login        TIMESTAMP,
  date_creation     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
  id             SERIAL PRIMARY KEY,
  nom            VARCHAR(100) NOT NULL,
  prenoms        VARCHAR(100) NOT NULL,
  email          VARCHAR(255) UNIQUE,
  date_naissance DATE,
  poste          VARCHAR(100),
  projet         VARCHAR(100),
  service_id     INTEGER REFERENCES services(id) ON DELETE SET NULL,
  date_embauche  DATE,
  telephone      VARCHAR(20),
  numero_secu    VARCHAR(20),
  numero_urgence VARCHAR(20),
  type_contrat   VARCHAR(50),
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status         employee_status NOT NULL DEFAULT 'actif'
);

-- ── Parc ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicules (
  id                 SERIAL PRIMARY KEY,
  immatriculation    VARCHAR(20)  NOT NULL UNIQUE,
  marque             VARCHAR(50)  NOT NULL,
  modele             VARCHAR(50)  NOT NULL,
  type_vehicule      VARCHAR(50)  NOT NULL,
  capacite           INTEGER      NOT NULL,
  kilometrage        INTEGER      DEFAULT 0,
  annee_mise_service SMALLINT,
  statut             vehicule_statut  DEFAULT 'disponible',
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  energie            vehicule_energie DEFAULT 'Diesel'
);

CREATE TABLE IF NOT EXISTS chauffeurs (
  id                     SERIAL PRIMARY KEY,
  nom                    VARCHAR(100) NOT NULL,
  prenoms                VARCHAR(100) NOT NULL,
  numero_permis          VARCHAR(50)  NOT NULL,
  type_permis            VARCHAR(20)  NOT NULL,
  date_expiration_permis DATE         NOT NULL,
  telephone              VARCHAR(20),
  email                  VARCHAR(100),
  statut                 chauffeur_statut DEFAULT 'disponible',
  created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_vehicules (
  id               SERIAL PRIMARY KEY,
  vehicule_id      INTEGER NOT NULL REFERENCES vehicules(id),
  type_maintenance VARCHAR(100) NOT NULL,
  date_debut       DATE NOT NULL,
  date_fin         DATE,
  cout             NUMERIC(10,2),
  description      TEXT,
  statut           maintenance_statut DEFAULT 'planifiee',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Demandes de sortie ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS demande_deplacement (
  id                    SERIAL PRIMARY KEY,
  employe_id            INTEGER NOT NULL REFERENCES employees(id),
  commune_id            INTEGER NOT NULL REFERENCES communes(id),
  date_deplacement      DATE    NOT NULL,
  heure_depart          TIME    NOT NULL,
  heure_retour          TIME    NOT NULL,
  objectif              TEXT    NOT NULL,
  statut                demande_dep_statut DEFAULT 'en_attente',
  chauffeur_id          INTEGER REFERENCES chauffeurs(id),
  vehicule_id           INTEGER REFERENCES vehicules(id),
  date_creation         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_modification     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  km_depart             INTEGER,
  km_retour             INTEGER,
  date_retour_effective DATE,
  heure_retour_reel     TIME,
  CONSTRAINT chk_km_coherence CHECK (km_retour IS NULL OR km_depart IS NULL OR km_retour >= km_depart)
);

CREATE TABLE IF NOT EXISTS demande_passagers (
  demande_id INTEGER NOT NULL REFERENCES demande_deplacement(id) ON DELETE CASCADE,
  employe_id INTEGER NOT NULL REFERENCES employees(id),
  PRIMARY KEY (demande_id, employe_id)
);

-- ── Sécurité / exploitation ──────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action     VARCHAR(50)  NOT NULL,
  entity     VARCHAR(50)  NOT NULL,
  entity_id  VARCHAR(100),
  details    TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS licences (
  id               SERIAL PRIMARY KEY,
  cle              VARCHAR(60)  NOT NULL UNIQUE,
  organisation     VARCHAR(200) NOT NULL,
  contact          VARCHAR(150),
  max_utilisateurs INTEGER      NOT NULL DEFAULT 10,
  max_connexions   INTEGER      NOT NULL DEFAULT 5,
  date_debut       DATE         NOT NULL DEFAULT CURRENT_DATE,
  date_expiration  DATE         NOT NULL,
  statut           VARCHAR(20)  NOT NULL DEFAULT 'active'
                   CHECK (statut IN ('active', 'expiree', 'suspendue')),
  modules          TEXT         DEFAULT 'all',
  notes            TEXT,
  cree_par         VARCHAR(100),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions_actives (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity   ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user     ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_demande_passagers_demande ON demande_passagers(demande_id);
CREATE INDEX IF NOT EXISTS idx_demande_passagers_employe ON demande_passagers(employe_id);
CREATE INDEX IF NOT EXISTS idx_deplacement_date     ON demande_deplacement(date_deplacement);
CREATE INDEX IF NOT EXISTS idx_deplacement_statut   ON demande_deplacement(statut);
CREATE INDEX IF NOT EXISTS idx_deplacement_terminee ON demande_deplacement(statut, date_retour_effective) WHERE statut = 'terminee';
CREATE UNIQUE INDEX IF NOT EXISTS idx_licence_active ON licences(statut) WHERE statut = 'active';
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions_actives(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions_actives(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role        ON users(role);

-- ── Triggers ─────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER check_employee_duplicate_requests BEFORE INSERT ON demande_deplacement FOR EACH ROW EXECUTE FUNCTION fn_check_employee_duplicate_requests();
CREATE OR REPLACE TRIGGER trg_demande_deplacement_modif    BEFORE UPDATE ON demande_deplacement FOR EACH ROW EXECUTE FUNCTION fn_update_date_modification();
CREATE OR REPLACE TRIGGER trg_users_modif                  BEFORE UPDATE ON users               FOR EACH ROW EXECUTE FUNCTION fn_update_date_modification();
CREATE OR REPLACE TRIGGER trg_employees_updated_at         BEFORE UPDATE ON employees           FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE OR REPLACE TRIGGER trg_vehicules_updated_at         BEFORE UPDATE ON vehicules           FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE OR REPLACE TRIGGER trg_chauffeurs_updated_at        BEFORE UPDATE ON chauffeurs          FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE OR REPLACE TRIGGER trg_maintenance_updated_at       BEFORE UPDATE ON maintenance_vehicules FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
