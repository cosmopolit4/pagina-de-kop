const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// SQL para crear las tablas — corré esto UNA VEZ en el SQL Editor de Supabase
const SETUP_SQL = `
-- Visitas
CREATE TABLE IF NOT EXISTS visits (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  page TEXT DEFAULT '/',
  referrer TEXT,
  user_agent TEXT
);

-- Postulaciones
CREATE TABLE IF NOT EXISTS applications (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  roblox_user TEXT NOT NULL,
  discord TEXT NOT NULL,
  role TEXT NOT NULL,
  motivation TEXT,
  experience TEXT,
  status TEXT DEFAULT 'pending'
);

-- Sorteos
CREATE TABLE IF NOT EXISTS raffles (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  participants TEXT[],
  winner TEXT NOT NULL,
  total_participants INTEGER
);

-- Trivia
CREATE TABLE IF NOT EXISTS trivia_results (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  score INTEGER NOT NULL,
  total INTEGER NOT NULL
);

-- Índices para analytics
CREATE INDEX IF NOT EXISTS visits_created_at_idx ON visits(created_at);
CREATE INDEX IF NOT EXISTS applications_created_at_idx ON applications(created_at);
`;

console.log('── SUPABASE SQL SETUP ──');
console.log('Corré este SQL en tu proyecto de Supabase (SQL Editor):');
console.log(SETUP_SQL);

module.exports = supabase;
