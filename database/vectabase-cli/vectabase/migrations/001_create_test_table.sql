-- Test migration
CREATE TABLE IF NOT EXISTS cli_test_table (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO cli_test_table (name) VALUES ('Test Entry 1');
