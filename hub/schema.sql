CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  path TEXT,
  type TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  parent_id TEXT,
  color TEXT,
  start_command TEXT,
  status TEXT NOT NULL DEFAULT 'idle',
  port INTEGER,
  external BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS process_snapshots (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  pid INTEGER,
  port INTEGER,
  external BOOLEAN NOT NULL DEFAULT false,
  process_name TEXT,
  output JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS git_snapshots (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  branch TEXT,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  commits JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS production_snapshots (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  service_id TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  service JSONB NOT NULL,
  deployments JSONB NOT NULL DEFAULT '[]'::jsonb,
  performance JSONB NOT NULL DEFAULT '[]'::jsonb,
  resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider, service_id)
);

CREATE TABLE IF NOT EXISTS database_snapshots (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, connection_id)
);

CREATE TABLE IF NOT EXISTS commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued',
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_commands_agent_status ON commands(agent_id, status);
