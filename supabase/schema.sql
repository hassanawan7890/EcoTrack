-- EcoTrack v2 — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL editor (https://supabase.com/dashboard → SQL Editor)

-- ─── Enable UUID Extension ───────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text not null,
  role        text not null default 'citizen'
                check (role in ('admin', 'crew', 'staff', 'citizen')),
  is_active   boolean not null default true,
  avatar_url  text,
  last_login  timestamptz,
  created_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'citizen')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Zones ───────────────────────────────────────────────────────────────────
create table if not exists public.zones (
  id          serial primary key,
  name        text not null unique,
  description text,
  coordinates jsonb,
  created_at  timestamptz not null default now()
);

-- ─── Recycling Centers ───────────────────────────────────────────────────────
create table if not exists public.recycling_centers (
  id          serial primary key,
  name        text not null,
  address     text,
  manager_id  uuid references public.profiles(id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── Vehicles ────────────────────────────────────────────────────────────────
create table if not exists public.vehicles (
  id             serial primary key,
  plate_number   text not null unique,
  type           text not null check (type in ('Garbage Truck', 'Recycling Truck', 'Organic Truck')),
  capacity_tons  numeric(6,2) not null default 10
);

-- ─── Routes ──────────────────────────────────────────────────────────────────
create table if not exists public.routes (
  id            serial primary key,
  name          text not null,
  zone_id       integer not null references public.zones(id) on delete cascade,
  crew_id       uuid references public.profiles(id) on delete set null,
  vehicle_id    integer references public.vehicles(id) on delete set null,
  schedule_day  text not null check (schedule_day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  path_coordinates jsonb,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ─── Pickup Requests ─────────────────────────────────────────────────────────
create table if not exists public.pickup_requests (
  id              serial primary key,
  citizen_id      uuid not null references public.profiles(id) on delete cascade,
  route_id        integer references public.routes(id) on delete set null,
  type            text not null check (type in ('Regular', 'Bulk', 'Special')),
  status          text not null default 'Pending'
                    check (status in ('Pending', 'Scheduled', 'Completed', 'Missed', 'Cancelled')),
  scheduled_date  date not null,
  address         text not null,
  notes           text,
  created_at      timestamptz not null default now()
);

-- ─── Pickup Status History ───────────────────────────────────────────────────
create table if not exists public.pickup_status_entries (
  id          serial primary key,
  pickup_id   integer not null references public.pickup_requests(id) on delete cascade,
  status      text not null,
  changed_by  uuid references public.profiles(id) on delete set null,
  notes       text,
  changed_at  timestamptz not null default now()
);

-- ─── Complaints ──────────────────────────────────────────────────────────────
create table if not exists public.complaints (
  id           serial primary key,
  citizen_id   uuid not null references public.profiles(id) on delete cascade,
  pickup_id    integer references public.pickup_requests(id) on delete set null,
  subject      text not null,
  description  text not null,
  status       text not null default 'Open'
                 check (status in ('Open', 'In Progress', 'Resolved')),
  resolution_notes text,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ─── Issue Reports ───────────────────────────────────────────────────────────
create table if not exists public.issue_reports (
  id           serial primary key,
  crew_id      uuid not null references public.profiles(id) on delete cascade,
  pickup_id    integer references public.pickup_requests(id) on delete set null,
  type         text not null check (type in ('Access Blocked','Container Full','Wrong Address','Hazardous Material','Other')),
  description  text not null,
  photo_url    text,
  status       text not null default 'Open'
                 check (status in ('Open', 'Reviewed', 'Closed')),
  admin_notes  text,
  created_at   timestamptz not null default now()
);

-- ─── Load Data ───────────────────────────────────────────────────────────────
create table if not exists public.load_data (
  id            serial primary key,
  staff_id      uuid not null references public.profiles(id) on delete cascade,
  center_id     integer not null references public.recycling_centers(id) on delete cascade,
  crew_id       uuid references public.profiles(id) on delete set null,
  gross_weight  numeric(10,2) not null,
  tare_weight   numeric(10,2) not null,
  net_weight    numeric(10,2) not null generated always as (gross_weight - tare_weight) stored,
  load_date     date not null,
  created_at    timestamptz not null default now()
);

-- ─── Material Categories ─────────────────────────────────────────────────────
create table if not exists public.material_categories (
  id    serial primary key,
  name  text not null unique
);

-- ─── Load Materials ──────────────────────────────────────────────────────────
create table if not exists public.load_materials (
  id           serial primary key,
  load_id      integer not null references public.load_data(id) on delete cascade,
  material_id  integer not null references public.material_categories(id) on delete cascade,
  weight_kg    numeric(10,2) not null
);

-- ─── Contamination Reports ───────────────────────────────────────────────────
create table if not exists public.contamination_reports (
  id          serial primary key,
  load_id     integer not null references public.load_data(id) on delete cascade,
  staff_id    uuid not null references public.profiles(id) on delete cascade,
  percent     numeric(5,2) not null check (percent >= 0 and percent <= 100),
  type        text not null,
  notes       text,
  photo_url   text,
  created_at  timestamptz not null default now()
);

-- ─── Notifications ───────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id          serial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_pickup_citizen   on public.pickup_requests(citizen_id);
create index if not exists idx_pickup_status    on public.pickup_requests(status);
create index if not exists idx_pickup_date      on public.pickup_requests(scheduled_date);
create index if not exists idx_notif_user       on public.notifications(user_id);
create index if not exists idx_notif_unread     on public.notifications(user_id, is_read) where is_read = false;
create index if not exists idx_complaint_user   on public.complaints(citizen_id);
create index if not exists idx_complaint_pickup on public.complaints(pickup_id);
create index if not exists idx_issue_crew       on public.issue_reports(crew_id);
create index if not exists idx_issue_status     on public.issue_reports(status);
create index if not exists idx_load_date        on public.load_data(load_date);
create index if not exists idx_contam_date      on public.contamination_reports(created_at);

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.pickup_requests enable row level security;
alter table public.complaints enable row level security;
alter table public.notifications enable row level security;
alter table public.issue_reports enable row level security;
alter table public.load_data enable row level security;
alter table public.load_materials enable row level security;
alter table public.contamination_reports enable row level security;
alter table public.zones enable row level security;
alter table public.routes enable row level security;
alter table public.recycling_centers enable row level security;
alter table public.vehicles enable row level security;
alter table public.material_categories enable row level security;
alter table public.pickup_status_entries enable row level security;

-- ─── Security Helper Functions ───────────────────────────────────────────────

-- Returns the authenticated user's role; runs as DB owner so it bypasses RLS
create or replace function public.get_my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Returns false for deactivated accounts; bypasses RLS to avoid circular dependency
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_active from public.profiles where id = auth.uid()), false)
$$;

-- ─── Profiles ────────────────────────────────────────────────────────────────

-- Any active authenticated user can see profiles (needed for crew/admin dropdowns)
create policy "Users view profiles" on public.profiles
  for select using (auth.role() = 'authenticated' and is_active_user());

-- Users can update their own profile but CANNOT change their role or active status
create policy "Users update own profile" on public.profiles
  for update
  using (id = auth.uid() and is_active_user())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
  );

-- Admins can do anything to any profile (insert/update/delete/select)
create policy "Admins manage profiles" on public.profiles
  for all using (get_my_role() = 'admin');

-- ─── Pickup Requests ─────────────────────────────────────────────────────────

create policy "Citizens and staff view pickups" on public.pickup_requests
  for select using (citizen_id = auth.uid() or get_my_role() in ('admin','crew','staff'));

create policy "Citizens create own pickups" on public.pickup_requests
  for insert with check (citizen_id = auth.uid());

-- Citizens can ONLY set their own pickups to Cancelled (not Completed/Missed/etc.)
create policy "Citizens cancel own pickups" on public.pickup_requests
  for update
  using (citizen_id = auth.uid())
  with check (citizen_id = auth.uid() and status = 'Cancelled');

-- Crew and admin can update any pickup to any valid status
create policy "Crew and admin update pickups" on public.pickup_requests
  for update
  using (get_my_role() in ('admin','crew'))
  with check (get_my_role() in ('admin','crew'));

-- ─── Complaints ──────────────────────────────────────────────────────────────

create policy "Citizens view own complaints" on public.complaints
  for select using (citizen_id = auth.uid() or get_my_role() = 'admin');

create policy "Citizens create own complaints" on public.complaints
  for insert with check (citizen_id = auth.uid());

create policy "Admins update complaints" on public.complaints
  for update using (get_my_role() = 'admin');

-- ─── Notifications ───────────────────────────────────────────────────────────

create policy "Users view own notifications" on public.notifications
  for select using (user_id = auth.uid());

-- Users can mark their own notifications read; prevent spoofing another user_id
create policy "Users update own notifications" on public.notifications
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Citizens can create notifications for themselves (e.g. complaint confirmation)
-- Crew/staff/admin can notify any user (e.g. pickup status change)
create policy "Create notifications" on public.notifications
  for insert with check (
    user_id = auth.uid()
    or get_my_role() in ('admin', 'crew', 'staff')
  );

-- ─── Issue Reports ───────────────────────────────────────────────────────────

create policy "Crew and admin view issues" on public.issue_reports
  for select using (crew_id = auth.uid() or get_my_role() = 'admin');

-- Must be crew AND must be filing as themselves (fixed: was OR, allowing any user)
create policy "Crew create own issues" on public.issue_reports
  for insert with check (get_my_role() = 'crew' and crew_id = auth.uid());

-- ─── Load Data ───────────────────────────────────────────────────────────────

create policy "Staff and admin view loads" on public.load_data
  for select using (get_my_role() in ('staff','admin'));

-- Staff must record under their own staff_id (prevents impersonation)
create policy "Staff insert own loads" on public.load_data
  for insert with check (get_my_role() = 'staff' and staff_id = auth.uid());

create policy "Admin update loads" on public.load_data
  for update using (get_my_role() = 'admin');

create policy "Admin delete loads" on public.load_data
  for delete using (get_my_role() = 'admin');

-- ─── Load Materials ──────────────────────────────────────────────────────────

create policy "Staff and admin view load materials" on public.load_materials
  for select using (get_my_role() in ('staff','admin'));

create policy "Staff and admin insert load materials" on public.load_materials
  for insert with check (get_my_role() in ('staff','admin'));

create policy "Admin update load materials" on public.load_materials
  for update using (get_my_role() = 'admin');

create policy "Admin delete load materials" on public.load_materials
  for delete using (get_my_role() = 'admin');

-- ─── Contamination Reports ───────────────────────────────────────────────────

create policy "Staff and admin view contamination" on public.contamination_reports
  for select using (get_my_role() in ('staff','admin'));

-- Staff must report under their own staff_id
create policy "Staff insert own contamination" on public.contamination_reports
  for insert with check (get_my_role() = 'staff' and staff_id = auth.uid());

create policy "Admin update contamination" on public.contamination_reports
  for update using (get_my_role() = 'admin');

create policy "Admin delete contamination" on public.contamination_reports
  for delete using (get_my_role() = 'admin');

-- ─── Reference Tables ────────────────────────────────────────────────────────

create policy "Authenticated users read zones" on public.zones
  for select using (auth.role() = 'authenticated');
create policy "Admins manage zones" on public.zones
  for all using (get_my_role() = 'admin');

create policy "Authenticated users read routes" on public.routes
  for select using (auth.role() = 'authenticated');
create policy "Admins manage routes" on public.routes
  for all using (get_my_role() = 'admin');

create policy "Authenticated users read centers" on public.recycling_centers
  for select using (auth.role() = 'authenticated');
create policy "Admins manage centers" on public.recycling_centers
  for all using (get_my_role() = 'admin');

create policy "Authenticated users read vehicles" on public.vehicles
  for select using (auth.role() = 'authenticated');
-- Previously missing: admins had no write access to vehicles
create policy "Admins manage vehicles" on public.vehicles
  for all using (get_my_role() = 'admin');

create policy "Authenticated users read material categories" on public.material_categories
  for select using (auth.role() = 'authenticated');
create policy "Admins manage material categories" on public.material_categories
  for all using (get_my_role() = 'admin');

-- ─── Pickup Status Entries ────────────────────────────────────────────────────

-- Citizens can see status history for their own pickups; crew/admin see all
create policy "View pickup status entries" on public.pickup_status_entries
  for select using (
    get_my_role() in ('admin','crew')
    or exists (
      select 1 from public.pickup_requests pr
      where pr.id = pickup_id and pr.citizen_id = auth.uid()
    )
  );

-- Only crew/admin can add entries AND must set changed_by to themselves
create policy "Crew and admin insert pickup status" on public.pickup_status_entries
  for insert with check (
    get_my_role() in ('crew','admin') and changed_by = auth.uid()
  );
