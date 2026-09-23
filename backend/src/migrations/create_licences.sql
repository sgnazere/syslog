-- ============================================================
-- MIGRATION : Système de licences SysLog
-- psql -U postgres -d eclog -f create_licences.sql
-- ============================================================

-- Table principale des licences
CREATE TABLE IF NOT EXISTS licences (
  id               SERIAL PRIMARY KEY,
  cle              VARCHAR(60)   UNIQUE NOT NULL,  -- SL-XXXXXXXX-XXXXXXXX-XXXXXXXX
  organisation     VARCHAR(200)  NOT NULL,
  contact          VARCHAR(150),
  max_utilisateurs INTEGER       NOT NULL DEFAULT 10,
  max_connexions   INTEGER       NOT NULL DEFAULT 5,
  date_debut       DATE          NOT NULL DEFAULT CURRENT_DATE,
  date_expiration  DATE          NOT NULL,
  statut           VARCHAR(20)   NOT NULL DEFAULT 'active'
                   CHECK (statut IN ('active', 'expiree', 'suspendue')),
  modules          TEXT          DEFAULT 'all',
  notes            TEXT,
  cree_par         VARCHAR(100),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Une seule licence active à la fois
CREATE UNIQUE INDEX IF NOT EXISTS idx_licence_active
  ON licences(statut)
  WHERE statut = 'active';

-- Table de suivi des sessions actives (connexions simultanées)
CREATE TABLE IF NOT EXISTS sessions_actives (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64)   UNIQUE NOT NULL,   -- SHA-256 du JWT
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  expires_at  TIMESTAMPTZ   NOT NULL,
  last_seen   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user     ON sessions_actives(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires  ON sessions_actives(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token    ON sessions_actives(token_hash);
