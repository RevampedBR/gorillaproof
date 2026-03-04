-- Migration: Add Stripe Billing Fields to Organizations table
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
    ADD COLUMN IF NOT EXISTS stripe_price_id text,
    ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';

-- Optional Constraint: only certain subscription statuses are expected from Stripe
-- active, past_due, canceled, unpaid, trialing, incomplete, incomplete_expired
