-- Vectabase Pulled Schema
-- From: http://localhost:3000

CREATE TABLE IF NOT EXISTS announcements (
  id integer NOT NULL DEFAULT nextval('announcements_id_seq'::regclass),
  content text NOT NULL,
  author_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cli_test_sync (
  id integer NOT NULL DEFAULT nextval('cli_test_sync_id_seq'::regclass)
);

CREATE TABLE IF NOT EXISTS edge_function_files (
  id integer NOT NULL DEFAULT nextval('edge_function_files_id_seq'::regclass),
  function_id integer,
  path text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edge_functions (
  id integer NOT NULL DEFAULT nextval('edge_functions_id_seq'::regclass),
  project_id integer,
  name text NOT NULL,
  slug text NOT NULL,
  trigger_type text DEFAULT 'http'::text,
  runtime text DEFAULT 'deno'::text,
  status text DEFAULT 'active'::text,
  timeout_ms integer DEFAULT 2000,
  memory_mb integer DEFAULT 128,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roblox_users (
  id integer NOT NULL DEFAULT nextval('roblox_users_id_seq'::regclass),
  project_id integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id integer NOT NULL DEFAULT nextval('sessions_id_seq'::regclass),
  user_id integer,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test (
  id integer NOT NULL DEFAULT nextval('test_id_seq'::regclass),
  project_id integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vault_secrets (
  id integer NOT NULL DEFAULT nextval('vault_secrets_id_seq'::regclass),
  project_id integer,
  name text NOT NULL,
  description text,
  value text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhooks (
  id integer NOT NULL DEFAULT nextval('webhooks_id_seq'::regclass),
  project_id integer,
  name text NOT NULL,
  url text NOT NULL,
  events ARRAY DEFAULT '{}'::text[],
  secret text,
  enabled boolean DEFAULT true,
  last_triggered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS yes123 (
  id integer NOT NULL DEFAULT nextval('yes123_id_seq'::regclass),
  project_id integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  test123 text
);

