-- ═══════════════════════════════════════════════════════════════════
-- PeakEstimator — Production Security Hardening Migration
-- Secures database from public reads/updates via targeted SECURE DEFINER functions
-- and tightens RLS policies on details tables.
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Projects Security Hardening ──────────────────────────────

-- Disable leaky public select and update policies on projects
DROP POLICY IF EXISTS "projects_share_token_select" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;

-- Re-add secure update policy for authenticated owners only
CREATE POLICY "projects_own_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Fetch project securely by token
CREATE OR REPLACE FUNCTION public.get_project_by_share_token(token TEXT)
RETURNS SETOF public.projects
SECURITY DEFINER
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM public.projects WHERE share_token = token;
$$;

-- Approve project securely by token
CREATE OR REPLACE FUNCTION public.approve_project_by_share_token(
  token TEXT,
  signature TEXT,
  message TEXT,
  selected_tier TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.projects
  SET
    status = 'approved',
    client_approved_at = NOW(),
    signature_data = signature,
    client_message = message,
    selected_option_tier = COALESCE(selected_tier, selected_option_tier),
    updated_at = NOW()
  WHERE share_token = token;
  
  RETURN FOUND;
END;
$$;

-- Request changes securely by token
CREATE OR REPLACE FUNCTION public.request_project_changes_by_share_token(
  token TEXT,
  message TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.projects
  SET
    client_message = message,
    updated_at = NOW()
  WHERE share_token = token;
  
  RETURN FOUND;
END;
$$;

-- Select option tier securely by token
CREATE OR REPLACE FUNCTION public.select_project_tier_by_share_token(
  token TEXT,
  tier TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.projects
  SET
    selected_option_tier = tier,
    updated_at = NOW()
  WHERE share_token = token;
  
  RETURN FOUND;
END;
$$;


-- ─── 2. Project Items Security Hardening ─────────────────────────

-- Disable leaky public select policy on project_items
DROP POLICY IF EXISTS "project_items_share_token_select" ON public.project_items;

-- Fetch project items securely by token
CREATE OR REPLACE FUNCTION public.get_project_items_by_share_token(token TEXT)
RETURNS SETOF public.project_items
SECURITY DEFINER
LANGUAGE sql
STABLE
AS $$
  SELECT pi.* FROM public.project_items pi
  JOIN public.projects p ON pi.project_id = p.id
  WHERE p.share_token = token
  ORDER BY pi.sort_order;
$$;


-- ─── 3. Deposit Requests Security Hardening ──────────────────────

-- Disable leaky public read policy on deposit_requests
DROP POLICY IF EXISTS "Public read deposit by project" ON public.deposit_requests;

-- Fetch deposit requests securely by token
CREATE OR REPLACE FUNCTION public.get_deposits_by_share_token(token TEXT)
RETURNS SETOF public.deposit_requests
SECURITY DEFINER
LANGUAGE sql
STABLE
AS $$
  SELECT dr.* FROM public.deposit_requests dr
  JOIN public.projects p ON dr.project_id = p.id
  WHERE p.share_token = token;
$$;


-- ─── 4. Revision Requests Security Hardening ─────────────────────

-- Disable leaky public read policy on revision_requests (frontend client only inserts)
DROP POLICY IF EXISTS "Public read own revision" ON public.revision_requests;


-- ─── 5. Maintenance Contracts Security Hardening ─────────────────

-- Disable leaky public read policy on maintenance_contracts
DROP POLICY IF EXISTS "Public read maintenance contract by token" ON public.maintenance_contracts;

-- Fetch contract securely by token
CREATE OR REPLACE FUNCTION public.get_maintenance_contract_by_token(token TEXT)
RETURNS SETOF public.maintenance_contracts
SECURITY DEFINER
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM public.maintenance_contracts WHERE share_token = token;
$$;

-- Sign contract securely by token
CREATE OR REPLACE FUNCTION public.sign_maintenance_contract_by_token(
  token TEXT,
  signature TEXT,
  client_name_val TEXT,
  client_email_val TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.maintenance_contracts
  SET
    status = 'active',
    signed_at = NOW(),
    signature_data = signature,
    client_name = client_name_val,
    client_email = client_email_val,
    updated_at = NOW()
  WHERE share_token = token;
  
  RETURN FOUND;
END;
$$;


-- ─── 6. Subcontractor Bids Security Hardening ────────────────────

-- Disable leaky public policies on subcontractor_bids
DROP POLICY IF EXISTS "Public read sub bid by token" ON public.subcontractor_bids;
DROP POLICY IF EXISTS "Public update sub bid by token" ON public.subcontractor_bids;

-- Fetch sub bid securely by token
CREATE OR REPLACE FUNCTION public.get_subcontractor_bid_by_token(token TEXT)
RETURNS SETOF public.subcontractor_bids
SECURITY DEFINER
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM public.subcontractor_bids WHERE bid_token = token;
$$;

-- Submit sub bid securely by token
CREATE OR REPLACE FUNCTION public.submit_subcontractor_bid_by_token(
  token TEXT,
  amount NUMERIC,
  notes_val TEXT,
  items_snapshot JSONB
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.subcontractor_bids
  SET
    status = 'bid_submitted',
    bid_amount = amount,
    notes = notes_val,
    scope_items = items_snapshot,
    bid_submitted_at = NOW(),
    updated_at = NOW()
  WHERE bid_token = token;
  
  RETURN FOUND;
END;
$$;
