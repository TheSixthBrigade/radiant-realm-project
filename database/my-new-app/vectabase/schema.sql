-- Vectabase Schema File
CREATE TABLE IF NOT EXISTS app_users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_users (username, email) VALUES ('max', 'max@example.com') ON CONFLICT DO NOTHING;
