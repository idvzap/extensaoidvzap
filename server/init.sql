CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    zapsign_token TEXT,
    advbox_token TEXT,
    idvzap_token TEXT,
    idvzap_api_url TEXT,
    idvzap_api_id TEXT,
    uazapi_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration: add uazapi_token if not exists (for existing DBs)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='uazapi_token') THEN
    ALTER TABLE users ADD COLUMN uazapi_token TEXT;
  END IF;
END $$;
