-- ============================================================
-- SCHEMA VEHICULE-CI
-- À adapter selon votre base existante
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── UTILISATEURS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  UNIQUE NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(20)   NOT NULL CHECK (role IN ('employee','manager','logistic','admin')),
  department    VARCHAR(100)  NOT NULL,
  phone         VARCHAR(30),
  active        BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── VÉHICULES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand    VARCHAR(50)  NOT NULL,
  model    VARCHAR(50)  NOT NULL,
  plate    VARCHAR(20)  UNIQUE NOT NULL,
  capacity INTEGER      NOT NULL CHECK (capacity > 0),
  type     VARCHAR(20)  NOT NULL CHECK (type IN ('sedan','suv','minibus','pickup')),
  color    VARCHAR(30),
  year     INTEGER,
  status   VARCHAR(20)  NOT NULL DEFAULT 'available'
           CHECK (status IN ('available','in_use','maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CHAUFFEURS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(30)  NOT NULL,
  license_number  VARCHAR(50),
  experience      INTEGER DEFAULT 0,
  status          VARCHAR(20)  NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available','on_mission','off')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DEMANDES DE SORTIE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_requests (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id         UUID NOT NULL REFERENCES users(id),
  purpose              TEXT NOT NULL,
  commune              VARCHAR(100) NOT NULL,
  request_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  trip_date            DATE NOT NULL,
  departure_time       TIME NOT NULL,
  return_time          TIME NOT NULL,
  status               VARCHAR(30) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','approved_manager','approved_logistic','rejected','completed')),
  manager_id           UUID REFERENCES users(id),
  manager_comment      TEXT,
  manager_approved_at  TIMESTAMPTZ,
  vehicle_id           UUID REFERENCES vehicles(id),
  driver_id            UUID REFERENCES drivers(id),
  logistic_assigned_at TIMESTAMPTZ,
  merged_with          UUID[],
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PASSAGERS D'UNE DEMANDE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS request_passengers (
  request_id   UUID NOT NULL REFERENCES vehicle_requests(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES users(id),
  PRIMARY KEY (request_id, passenger_id)
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id),
  title      VARCHAR(200) NOT NULL,
  message    TEXT NOT NULL,
  type       VARCHAR(20)  NOT NULL DEFAULT 'info'
             CHECK (type IN ('info','success','warning','error')),
  read       BOOLEAN NOT NULL DEFAULT false,
  request_id UUID REFERENCES vehicle_requests(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── JOURS FERIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS holidays (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name      VARCHAR(100) NOT NULL,
  date      DATE NOT NULL UNIQUE,
  recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AUDIT LOGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id),
  action     VARCHAR(50)  NOT NULL,
  entity     VARCHAR(50)  NOT NULL,
  entity_id  VARCHAR(100),
  details    TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEX ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_requests_status    ON vehicle_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_trip_date ON vehicle_requests(trip_date);
CREATE INDEX IF NOT EXISTS idx_requests_commune   ON vehicle_requests(commune);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON vehicle_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user        ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_user         ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity       ON audit_logs(entity, entity_id);
