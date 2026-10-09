BEGIN;
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE CHECK(email=lower(email)), name text NOT NULL,
 role text NOT NULL CHECK(role IN ('admin','assessor')), password_hash text NOT NULL,
 upload_password_hash text, upload_version integer NOT NULL DEFAULT 0,
 active boolean NOT NULL DEFAULT true, is_owner boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS only_one_owner ON users(is_owner) WHERE is_owner;
CREATE TABLE IF NOT EXISTS sessions (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), refresh_hash text NOT NULL UNIQUE,
 csrf_nonce text NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS assets (
 id varchar(40) PRIMARY KEY CHECK(id ~ '^[A-Z0-9-]{1,40}$'), location text NOT NULL, company text NOT NULL,
 advertiser text NOT NULL DEFAULT '', contact text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '',
 phone text NOT NULL DEFAULT '', gps text NOT NULL DEFAULT '', last_maintenance date, next_maintenance date,
 comments text NOT NULL DEFAULT '', condition text NOT NULL DEFAULT 'Not assessed' CHECK(condition IN ('Not assessed','Very Good','Good','Fair','Poor','Very Poor')),
 priority text NOT NULL DEFAULT 'Not assigned' CHECK(priority IN ('Not assigned','P1 — Urgent','P2 — High','P3 — Medium','P4 — Low')),
 maintenance_type text NOT NULL DEFAULT 'Not specified' CHECK(maintenance_type IN ('Not specified','Inspection','Preventive maintenance','Corrective repairs','Structural repairs','Electrical / lighting','Cleaning','Painting / corrosion treatment','Advertising face replacement','Other')),
 assessed_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS active_assets_updated ON assets(updated_at DESC) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS photos (
 id uuid PRIMARY KEY, asset_id varchar(40) NOT NULL REFERENCES assets(id), name text NOT NULL,
 blob_url text NOT NULL, blob_path text NOT NULL UNIQUE, content_type text NOT NULL,
 size_bytes integer NOT NULL CHECK(size_bytes>0), uploaded_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_asset ON photos(asset_id);
CREATE TABLE IF NOT EXISTS deletion_requests (
 id uuid PRIMARY KEY, asset_id varchar(40) NOT NULL REFERENCES assets(id), requested_by_id uuid NOT NULL REFERENCES users(id),
 reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 2000), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), reviewed_by_id uuid REFERENCES users(id), reviewed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_deletion ON deletion_requests(asset_id) WHERE status='pending';
CREATE TABLE IF NOT EXISTS upload_grants (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), session_id uuid NOT NULL REFERENCES sessions(id),
 asset_id varchar(40) NOT NULL REFERENCES assets(id), upload_version integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
 key text PRIMARY KEY, window_start timestamptz NOT NULL, attempts integer NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid REFERENCES users(id), action text NOT NULL,
 entity_id text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS blob_cleanup_jobs (
 id uuid PRIMARY KEY, blob_url text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0, last_error text
);
COMMIT;
