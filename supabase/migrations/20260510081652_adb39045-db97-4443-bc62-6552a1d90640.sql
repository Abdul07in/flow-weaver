
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "profiles update self"
  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles insert self"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

-- auto profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- flows
create table public.flows (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled flow',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.flows enable row level security;
create index flows_owner_idx on public.flows(owner_id);

-- flow_shares
create table public.flow_shares (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.flows(id) on delete cascade,
  shared_with uuid not null references auth.users(id) on delete cascade,
  permission text not null check (permission in ('view','edit')),
  created_at timestamptz not null default now(),
  unique (flow_id, shared_with)
);
alter table public.flow_shares enable row level security;
create index flow_shares_user_idx on public.flow_shares(shared_with);

-- flow_share_links
create table public.flow_share_links (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.flows(id) on delete cascade,
  token text not null unique,
  permission text not null check (permission in ('view','edit')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.flow_share_links enable row level security;

-- helper: does user have at least view access?
create or replace function public.flow_permission(_flow uuid, _user uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.flows where id = _flow and owner_id = _user) then 'edit'
    else (select permission from public.flow_shares where flow_id = _flow and shared_with = _user limit 1)
  end;
$$;

-- flows policies
create policy "flows owner all"
  on public.flows for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "flows shared select"
  on public.flows for select to authenticated
  using (exists (select 1 from public.flow_shares s where s.flow_id = id and s.shared_with = auth.uid()));

create policy "flows shared update"
  on public.flows for update to authenticated
  using (exists (select 1 from public.flow_shares s where s.flow_id = id and s.shared_with = auth.uid() and s.permission = 'edit'))
  with check (exists (select 1 from public.flow_shares s where s.flow_id = id and s.shared_with = auth.uid() and s.permission = 'edit'));

-- flow_shares policies
create policy "shares owner manage"
  on public.flow_shares for all to authenticated
  using (exists (select 1 from public.flows f where f.id = flow_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from public.flows f where f.id = flow_id and f.owner_id = auth.uid()));

create policy "shares user read own"
  on public.flow_shares for select to authenticated
  using (shared_with = auth.uid());

-- flow_share_links policies
create policy "links owner manage"
  on public.flow_share_links for all to authenticated
  using (exists (select 1 from public.flows f where f.id = flow_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from public.flows f where f.id = flow_id and f.owner_id = auth.uid()));

-- claim share link: any authed user can use a token
create or replace function public.claim_share_link(_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  link record;
begin
  select * into link from public.flow_share_links where token = _token;
  if link is null then
    raise exception 'Invalid share link';
  end if;
  -- don't add the owner to shares
  if exists (select 1 from public.flows where id = link.flow_id and owner_id = auth.uid()) then
    return link.flow_id;
  end if;
  insert into public.flow_shares (flow_id, shared_with, permission)
  values (link.flow_id, auth.uid(), link.permission)
  on conflict (flow_id, shared_with) do update set permission =
    case when public.flow_shares.permission = 'edit' then 'edit' else excluded.permission end;
  return link.flow_id;
end; $$;

-- bump updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger flows_touch before update on public.flows
  for each row execute procedure public.touch_updated_at();
