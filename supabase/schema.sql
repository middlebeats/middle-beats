-- ============================================================
-- MIDDLE BEATS — Complete Database Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- ── EXTENSIONS ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────
-- Extends Supabase auth.users with role and artist info
create table public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  role         text not null check (role in ('admin', 'artist')) default 'artist',
  artist_name  text,
  email        text,
  avatar_url   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── ARTISTS ──────────────────────────────────────────────────
create table public.artists (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete set null,
  name         text not null,
  name_ar      text,
  email        text not null unique,
  phone        text,
  bio          text,
  avatar_url   text,
  is_active    boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── RELEASES ─────────────────────────────────────────────────
create table public.releases (
  id           uuid default uuid_generate_v4() primary key,
  artist_id    uuid references public.artists(id) on delete cascade not null,
  title        text not null,
  title_ar     text,
  upc          text,
  release_date date,
  cover_url    text,
  created_at   timestamptz default now()
);

-- ── TRACKS ───────────────────────────────────────────────────
create table public.tracks (
  id           uuid default uuid_generate_v4() primary key,
  artist_id    uuid references public.artists(id) on delete cascade not null,
  release_id   uuid references public.releases(id) on delete set null,
  title        text not null,
  title_ar     text,
  isrc         text,
  created_at   timestamptz default now()
);

-- ── REPORT UPLOADS ───────────────────────────────────────────
create table public.report_uploads (
  id           uuid default uuid_generate_v4() primary key,
  filename     text not null,
  source       text not null check (source in ('other_platforms', 'anghami', 'unknown')),
  period_start date,
  period_end   date,
  row_count    integer default 0,
  uploaded_by  uuid references public.profiles(id),
  uploaded_at  timestamptz default now()
);

-- ── ROYALTY RECORDS ──────────────────────────────────────────
create table public.royalty_records (
  id             uuid default uuid_generate_v4() primary key,
  upload_id      uuid references public.report_uploads(id) on delete cascade,
  artist_id      uuid references public.artists(id) on delete cascade not null,
  track_id       uuid references public.tracks(id) on delete set null,
  release_title  text,
  track_title    text,
  period         text not null,   -- e.g. '2026-01'
  year           text,
  platform       text not null,
  country        text,
  streams        integer default 0,
  revenue        numeric(18,8) default 0,
  currency       text default 'USD',
  isrc           text,
  upc            text,
  source         text,
  created_at     timestamptz default now()
);

-- ── ROYALTY STATEMENTS ───────────────────────────────────────
create table public.royalty_statements (
  id             uuid default uuid_generate_v4() primary key,
  artist_id      uuid references public.artists(id) on delete cascade not null,
  period         text not null,   -- e.g. '2026-01'
  total_revenue  numeric(18,8) default 0,
  total_streams  integer default 0,
  status         text default 'draft' check (status in ('draft','sent','paid')),
  pdf_url        text,
  sent_at        timestamptz,
  created_at     timestamptz default now()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
create table public.notifications (
  id           uuid default uuid_generate_v4() primary key,
  artist_id    uuid references public.artists(id) on delete cascade not null,
  title        text not null,
  message      text not null,
  type         text default 'info' check (type in ('info','statement','alert')),
  is_read      boolean default false,
  created_at   timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.artists           enable row level security;
alter table public.releases          enable row level security;
alter table public.tracks            enable row level security;
alter table public.report_uploads    enable row level security;
alter table public.royalty_records   enable row level security;
alter table public.royalty_statements enable row level security;
alter table public.notifications     enable row level security;

-- ── HELPER FUNCTION ──────────────────────────────────────────
create or replace function public.get_my_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function public.get_my_artist_id()
returns uuid as $$
  select a.id from public.artists a
  join public.profiles p on p.id = auth.uid()
  where a.user_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- ── PROFILES POLICIES ────────────────────────────────────────
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.get_my_role() = 'admin');

-- ── ARTISTS POLICIES ─────────────────────────────────────────
create policy "Artists can view own record"
  on public.artists for select
  using (user_id = auth.uid());

create policy "Admins can do everything on artists"
  on public.artists for all
  using (public.get_my_role() = 'admin');

-- ── RELEASES POLICIES ────────────────────────────────────────
create policy "Artists can view own releases"
  on public.releases for select
  using (artist_id = public.get_my_artist_id());

create policy "Admins can do everything on releases"
  on public.releases for all
  using (public.get_my_role() = 'admin');

-- ── TRACKS POLICIES ──────────────────────────────────────────
create policy "Artists can view own tracks"
  on public.tracks for select
  using (artist_id = public.get_my_artist_id());

create policy "Admins can do everything on tracks"
  on public.tracks for all
  using (public.get_my_role() = 'admin');

-- ── REPORT UPLOADS POLICIES ──────────────────────────────────
create policy "Admins only on report_uploads"
  on public.report_uploads for all
  using (public.get_my_role() = 'admin');

-- ── ROYALTY RECORDS POLICIES ─────────────────────────────────
create policy "Artists can view own royalty records"
  on public.royalty_records for select
  using (artist_id = public.get_my_artist_id());

create policy "Admins can do everything on royalty_records"
  on public.royalty_records for all
  using (public.get_my_role() = 'admin');

-- ── ROYALTY STATEMENTS POLICIES ──────────────────────────────
create policy "Artists can view own statements"
  on public.royalty_statements for select
  using (artist_id = public.get_my_artist_id());

create policy "Admins can do everything on statements"
  on public.royalty_statements for all
  using (public.get_my_role() = 'admin');

-- ── NOTIFICATIONS POLICIES ───────────────────────────────────
create policy "Artists can view own notifications"
  on public.notifications for select
  using (artist_id = public.get_my_artist_id());

create policy "Artists can mark own notifications read"
  on public.notifications for update
  using (artist_id = public.get_my_artist_id());

create policy "Admins can do everything on notifications"
  on public.notifications for all
  using (public.get_my_role() = 'admin');

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'artist')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index idx_royalty_records_artist  on public.royalty_records(artist_id);
create index idx_royalty_records_period  on public.royalty_records(period);
create index idx_royalty_records_platform on public.royalty_records(platform);
create index idx_notifications_artist    on public.notifications(artist_id);
create index idx_artists_user_id         on public.artists(user_id);
