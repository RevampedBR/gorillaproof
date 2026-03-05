-- ==========================================================
-- Migration: Per-proof download lock
-- Allows owners to block file downloads per proof
-- ==========================================================

ALTER TABLE proofs ADD COLUMN IF NOT EXISTS download_locked BOOLEAN DEFAULT FALSE;
