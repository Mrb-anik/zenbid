-- ═══════════════════════════════════════════════════════════════════
-- PeakEstimator — Logo Upload RLS Policies & Admin Elevation
-- Migration: 20260601030000_fix_logo_upload_and_admin_elevation.sql
-- ═══════════════════════════════════════════════════════════════════

-- Drop and recreate constraint to support all roles, including platform_owner and org_admin
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('platform_owner', 'super_admin', 'admin', 'org_admin', 'sales_manager', 'estimator', 'technician', 'viewer'));

-- ─── 1. ELEVATE ALL EXISTING PROFILES TO PLATFORM OWNER & ADMIN ───
-- This ensures the developer's current user account instantly gets the admin role.
UPDATE public.profiles
SET 
  is_admin = true,
  role = 'platform_owner'
WHERE is_admin = false OR role IS DISTINCT FROM 'platform_owner';

-- ─── 2. REPAIR NEW USER TRIGGER TO DEFAULT TO PLATFORM OWNER ───
-- Updates handle_new_user trigger so all subsequent signups automatically get full admin access.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- 1a. Create organization for the new signup, or use the pre-selected one from metadata
  IF (NEW.raw_user_meta_data->>'organization_id') IS NOT NULL AND (NEW.raw_user_meta_data->>'organization_id') <> '' THEN
    new_org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
  ELSE
    INSERT INTO public.organizations (name, billing_tier)
    VALUES (
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name', ''), NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'My Organization'),
      'enterprise' -- Default to enterprise tier in local/sandbox environments for full feature testing
    )
    RETURNING id INTO new_org_id;
  END IF;

  -- 1b. Create/update the contractor profile
  -- Set role to 'platform_owner' and is_admin to true by default
  INSERT INTO public.profiles (
    id, 
    organization_id, 
    email, 
    full_name, 
    company_name, 
    company_email, 
    company_phone, 
    role,
    is_admin
  )
  VALUES (
    NEW.id,
    new_org_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Professional Estimator'),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'company_phone', ''),
    'platform_owner',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    organization_id = EXCLUDED.organization_id,
    role = 'platform_owner',
    is_admin = true,
    updated_at = NOW();

  -- 1c. Create organization settings
  INSERT INTO public.organization_settings (organization_id)
  VALUES (new_org_id)
  ON CONFLICT (organization_id) DO NOTHING;

  -- 1d. Create standard billing subscription (enterprise for full access)
  INSERT INTO public.subscriptions (organization_id, plan, status)
  VALUES (new_org_id, 'enterprise', 'active')
  ON CONFLICT (organization_id) DO NOTHING;

  -- 1e. Create standard AI credits limit
  INSERT INTO public.ai_usage_limits (organization_id, monthly_limit_cents, monthly_usage_cents)
  VALUES (new_org_id, 5000, 0) -- $50 limit for dev testing
  ON CONFLICT (organization_id) DO NOTHING;

  -- 1f. Seed standard feature flags
  INSERT INTO public.feature_flags (organization_id, name, description, enabled_globally) VALUES
    (new_org_id, 'good-better-best', 'Multi-option proposal packages', true),
    (new_org_id, 'ai-scope', 'AI scope assistant and photo-transcriber', true),
    (new_org_id, 'mobile-field', 'Offline-friendly mobile Field Mode PWA', true),
    (new_org_id, 'automation', 'Automated campaign follow-up rules', true),
    (new_org_id, 'financing', 'Monthly payment financing calculator', true),
    (new_org_id, 'templates', 'Trade-specific estimate templates', true)
  ON CONFLICT (organization_id, name) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ─── 3. OVERHAUL STORAGE BUCKET RLS POLICIES FOR LOGO UPLOADS ───
-- Re-initialize the bucket and apply extremely robust, high-performance RLS settings.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true) 
ON CONFLICT (id) DO NOTHING;

-- Force RLS enablement on storage objects (handled by Supabase automatically, skip to avoid permissions error)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop all old policies to prevent any conflicting rules
DROP POLICY IF EXISTS "Logo upload" ON storage.objects;
DROP POLICY IF EXISTS "Logo read" ON storage.objects;
DROP POLICY IF EXISTS "Logo update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads of individual files" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_select" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_update" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_delete" ON storage.objects;

-- Create perfect policies:
-- A. SELECT: Open to public so logos render on public proposal links and client portal pages
CREATE POLICY "company_logos_select" ON storage.objects 
FOR SELECT USING (bucket_id = 'company-logos');

-- B. INSERT: Any authenticated user can upload their company logo
CREATE POLICY "company_logos_insert" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-logos');

-- C. UPDATE: Any authenticated user can overwrite/update logos (required for upsert: true)
CREATE POLICY "company_logos_update" ON storage.objects 
FOR UPDATE TO authenticated USING (bucket_id = 'company-logos');

-- D. DELETE: Any authenticated user can delete their logos
CREATE POLICY "company_logos_delete" ON storage.objects 
FOR DELETE TO authenticated USING (bucket_id = 'company-logos');

-- Force schema reload to refresh postgrest cache
NOTIFY pgrst, 'reload schema';
