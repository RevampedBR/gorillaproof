-- Add new settings columns to organizations table

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS language text DEFAULT 'pt-BR',
    ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Sao_Paulo',
    ADD COLUMN IF NOT EXISTS brand_logo_url text,
    ADD COLUMN IF NOT EXISTS reviewer_auth_mode text DEFAULT 'email_verify',
    ADD COLUMN IF NOT EXISTS default_proof_status text DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS viewer_theme text DEFAULT 'dark',
    ADD COLUMN IF NOT EXISTS auto_lock_on_decision boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS allow_download boolean DEFAULT true;

-- Ensure auth modes and themes are valid
ALTER TABLE public.organizations
    ADD CONSTRAINT valid_reviewer_auth_mode CHECK (reviewer_auth_mode IN ('open', 'email_verify')),
    ADD CONSTRAINT valid_default_proof_status CHECK (default_proof_status IN ('draft', 'in_review')),
    ADD CONSTRAINT valid_viewer_theme CHECK (viewer_theme IN ('light', 'dark'));
