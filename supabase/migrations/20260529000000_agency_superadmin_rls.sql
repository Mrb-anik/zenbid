-- ============================================================
-- Agency Superadmin RLS Bypass Policies
-- Allows superadmin (is_admin = true) to read and manage
-- all client data across users — GHL-style agency owner.
-- ============================================================

-- Helper: check if the currently logged-in user is an admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ── projects ────────────────────────────────────────────────
drop policy if exists "admin_select_all_projects" on public.projects;
create policy "admin_select_all_projects"
  on public.projects for select
  using (public.is_admin());

drop policy if exists "admin_insert_any_project" on public.projects;
create policy "admin_insert_any_project"
  on public.projects for insert
  with check (public.is_admin());

drop policy if exists "admin_update_any_project" on public.projects;
create policy "admin_update_any_project"
  on public.projects for update
  using (public.is_admin());

drop policy if exists "admin_delete_any_project" on public.projects;
create policy "admin_delete_any_project"
  on public.projects for delete
  using (public.is_admin());

-- ── price_book ──────────────────────────────────────────────
drop policy if exists "admin_select_all_price_book" on public.price_book;
create policy "admin_select_all_price_book"
  on public.price_book for select
  using (public.is_admin());

drop policy if exists "admin_insert_any_price_book" on public.price_book;
create policy "admin_insert_any_price_book"
  on public.price_book for insert
  with check (public.is_admin());

drop policy if exists "admin_update_any_price_book" on public.price_book;
create policy "admin_update_any_price_book"
  on public.price_book for update
  using (public.is_admin());

drop policy if exists "admin_delete_any_price_book" on public.price_book;
create policy "admin_delete_any_price_book"
  on public.price_book for delete
  using (public.is_admin());

-- ── profiles (admin can read/update any profile) ────────────
drop policy if exists "admin_select_all_profiles" on public.profiles;
create policy "admin_select_all_profiles"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "admin_update_any_profile" on public.profiles;
create policy "admin_update_any_profile"
  on public.profiles for update
  using (public.is_admin());

-- ── support_tickets ─────────────────────────────────────────
drop policy if exists "admin_select_all_tickets" on public.support_tickets;
create policy "admin_select_all_tickets"
  on public.support_tickets for select
  using (public.is_admin());

drop policy if exists "admin_update_any_ticket" on public.support_tickets;
create policy "admin_update_any_ticket"
  on public.support_tickets for update
  using (public.is_admin());

-- ── ticket_responses ────────────────────────────────────────
drop policy if exists "admin_select_all_ticket_responses" on public.ticket_responses;
create policy "admin_select_all_ticket_responses"
  on public.ticket_responses for select
  using (public.is_admin());

drop policy if exists "admin_insert_ticket_response" on public.ticket_responses;
create policy "admin_insert_ticket_response"
  on public.ticket_responses for insert
  with check (public.is_admin());

-- ── notifications ───────────────────────────────────────────
drop policy if exists "admin_select_all_notifications" on public.notifications;
create policy "admin_select_all_notifications"
  on public.notifications for select
  using (public.is_admin());

-- ── activity_events ─────────────────────────────────────────
drop policy if exists "admin_select_all_activity" on public.activity_events;
create policy "admin_select_all_activity"
  on public.activity_events for select
  using (public.is_admin());

-- ── subscriptions ───────────────────────────────────────────
drop policy if exists "admin_select_all_subscriptions" on public.subscriptions;
create policy "admin_select_all_subscriptions"
  on public.subscriptions for select
  using (public.is_admin());

drop policy if exists "admin_update_any_subscription" on public.subscriptions;
create policy "admin_update_any_subscription"
  on public.subscriptions for update
  using (public.is_admin());
