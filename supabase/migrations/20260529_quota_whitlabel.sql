-- Migration: Add custom domain verification and enterprise quota tracking columns
-- Created: 2026-05-29

-- 1. Add Custom Domain fields to organizations
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS custom_domain_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cloudflare_hostname_id text,
  ADD COLUMN IF NOT EXISTS cloudflare_ssl_status text;

-- 2. Add Quota & Revenue Intelligence fields to organization_quotas
ALTER TABLE public.organization_quotas
  ADD COLUMN IF NOT EXISTS max_automations integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS automations_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_api_requests_per_month integer DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS api_requests_this_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_communications_per_month integer DEFAULT 500,
  ADD COLUMN IF NOT EXISTS communications_this_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expansion_score numeric DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS upgrade_likelihood text DEFAULT 'low';

-- Add Check Constraint if not exists for upgrade_likelihood
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organization_quotas_upgrade_likelihood_check'
  ) THEN
    ALTER TABLE public.organization_quotas
      ADD CONSTRAINT organization_quotas_upgrade_likelihood_check 
      CHECK (upgrade_likelihood IN ('low', 'medium', 'high', 'critical'));
  END IF;
END $$;
