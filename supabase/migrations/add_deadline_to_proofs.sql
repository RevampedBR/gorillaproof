-- Add deadline column to proofs table
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ DEFAULT NULL;
