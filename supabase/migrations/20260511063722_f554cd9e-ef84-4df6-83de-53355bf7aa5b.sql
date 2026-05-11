
-- Fix infinite recursion between flows and flow_shares RLS by using SECURITY DEFINER helpers.

create or replace function public.is_flow_owner(_flow_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.flows where id = _flow_id and owner_id = auth.uid()) $$;

create or replace function public.flow_share_permission(_flow_id uuid)
returns text
language sql stable security definer set search_path = public
as $$ select permission from public.flow_shares where flow_id = _flow_id and shared_with = auth.uid() limit 1 $$;

-- flows policies
drop policy if exists "flows owner all" on public.flows;
drop policy if exists "flows shared select" on public.flows;
drop policy if exists "flows shared update" on public.flows;

create policy "flows owner all" on public.flows
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "flows shared select" on public.flows
  for select to authenticated
  using (public.flow_share_permission(id) is not null);

create policy "flows shared update" on public.flows
  for update to authenticated
  using (public.flow_share_permission(id) = 'edit')
  with check (public.flow_share_permission(id) = 'edit');

-- flow_shares policies
drop policy if exists "shares owner manage" on public.flow_shares;
drop policy if exists "shares user read own" on public.flow_shares;

create policy "shares owner manage" on public.flow_shares
  for all to authenticated
  using (public.is_flow_owner(flow_id))
  with check (public.is_flow_owner(flow_id));

create policy "shares user read own" on public.flow_shares
  for select to authenticated
  using (shared_with = auth.uid());

-- flow_share_links policies
drop policy if exists "links owner manage" on public.flow_share_links;
create policy "links owner manage" on public.flow_share_links
  for all to authenticated
  using (public.is_flow_owner(flow_id))
  with check (public.is_flow_owner(flow_id));
