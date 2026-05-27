-- ============================================================
-- PeakEstimator — Phase 3+ Realtime & Magic Close Upgrades
-- Migration: 20260601020000_realtime_and_magic.sql
-- ============================================================

-- 1. Enable REPLICA IDENTITY FULL on projects for detailed update payloads in realtime
ALTER TABLE public.projects REPLICA IDENTITY FULL;

-- 2. Trigger function to automatically log project events (create/status change) into activity_events
CREATE OR REPLACE FUNCTION public.handle_project_activity_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_title text;
  v_desc text;
  v_action_type text;
BEGIN
  -- Attribute action to current auth user, or fallback to the project owner
  v_user_id := COALESCE(auth.uid(), NEW.user_id);
  v_org_id := NEW.organization_id;

  -- 1. INSERT CASE
  IF (TG_OP = 'INSERT') THEN
    v_action_type := 'created';
    v_title := 'Estimate Created';
    v_desc := NEW.name || ' created for client ' || COALESCE(NEW.client_name, 'Unknown');
  
  -- 2. UPDATE CASE
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action_type := NEW.status;
      
      IF NEW.status = 'approved' THEN
        v_title := 'Proposal Approved';
        v_desc := NEW.name || ' approved by ' || COALESCE(NEW.client_name, 'Client') || ' (Digital Signature Captured)';
      ELSIF NEW.status = 'sent' THEN
        v_title := 'Proposal Sent';
        v_desc := NEW.name || ' sent to ' || COALESCE(NEW.client_email, 'Client');
      ELSIF NEW.status = 'won' THEN
        v_title := 'Project Won';
        v_desc := NEW.name || ' marked as won!';
      ELSIF NEW.status = 'lost' THEN
        v_title := 'Project Lost';
        v_desc := NEW.name || ' marked as lost.';
      ELSE
        v_title := 'Status Updated';
        v_desc := NEW.name || ' status changed from ' || OLD.status || ' to ' || NEW.status;
      END IF;
    END IF;
  END IF;

  -- Insert event into activity_events if action is identified
  IF v_action_type IS NOT NULL THEN
    INSERT INTO public.activity_events (
      user_id,
      organization_id,
      entity_type,
      entity_id,
      action_type,
      metadata
    )
    VALUES (
      v_user_id,
      v_org_id,
      'estimate',
      NEW.id,
      v_action_type,
      jsonb_build_object(
        'title', v_title,
        'description', v_desc,
        'client_name', NEW.client_name,
        'total_value', NEW.total_value
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_activity_event ON public.projects;
CREATE TRIGGER trg_project_activity_event
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_project_activity_event();

-- 3. RLS policy to allow organization members to read activity events of their tenant
DROP POLICY IF EXISTS "Org members read own activity_events" ON public.activity_events;
CREATE POLICY "Org members read own activity_events" ON public.activity_events
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND organization_id IS NOT NULL
    )
    OR public.is_platform_owner()
  );
