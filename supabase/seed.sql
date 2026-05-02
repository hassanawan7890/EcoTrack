-- EcoTrack v2 — Seed Data
-- Run AFTER schema.sql in the Supabase SQL editor.
-- Users must be created via Supabase Auth first (see README.md).

-- ─── Zones ───────────────────────────────────────────────────────────────────
insert into public.zones (name, description) values
  ('Downtown',    'Central business district and surrounding residential areas'),
  ('Riverside',   'Waterfront neighborhoods along the main river corridor'),
  ('University',  'Campus district including student housing and faculty areas'),
  ('Industrial',  'Commercial and light manufacturing zones in the east end'),
  ('Suburban',    'Residential subdivisions in the northern outskirts')
on conflict (name) do nothing;

-- ─── Vehicles ────────────────────────────────────────────────────────────────
insert into public.vehicles (plate_number, type, capacity_tons) values
  ('ECO-001', 'Garbage Truck',   12.0),
  ('ECO-002', 'Recycling Truck',  8.5),
  ('ECO-003', 'Organic Truck',    6.0)
on conflict (plate_number) do nothing;

-- ─── Material Categories ─────────────────────────────────────────────────────
insert into public.material_categories (name) values
  ('Paper'), ('Plastic'), ('Metal'), ('Glass'), ('Organic')
on conflict (name) do nothing;

-- ─── Recycling Centers ───────────────────────────────────────────────────────
insert into public.recycling_centers (name, address, is_active) values
  ('Central Recycling Hub',     '100 Industrial Blvd, Zone 4',   true),
  ('Riverside Processing Plant', '22 River Rd, Zone 2',           true),
  ('North Depot',                '5 Suburban Ave, Zone 5',        true)
on conflict do nothing;

-- NOTE: Routes are inserted after user accounts exist.
-- Run the following AFTER creating accounts via Supabase Auth Dashboard or API.

-- Example route inserts (replace <crew_uuid> with actual crew user IDs):
-- insert into public.routes (name, zone_id, schedule_day) values
--   ('Route A — Downtown',    1, 'Monday'),
--   ('Route B — Riverside',   2, 'Tuesday'),
--   ('Route C — University',  3, 'Wednesday'),
--   ('Route D — Industrial',  4, 'Thursday'),
--   ('Route E — Suburban',    5, 'Friday');

-- ─── Demo Notifications (will be populated automatically by app logic) ───────
-- Notifications are created by:
--   1. Submitting a complaint (citizen gets acknowledgement)
--   2. Crew updating a pickup status (citizen gets status notification)
--   3. Admin actions

-- ─── Demo pickup requests ─────────────────────────────────────────────────────
-- These will be populated via the app after users register.
-- Sample data below — replace citizen UUIDs after creating accounts:

-- insert into public.pickup_requests (citizen_id, type, status, scheduled_date, address, notes)
-- values
--   ('<citizen-uuid>', 'Regular', 'Scheduled',  current_date + 2, '12 Oak Street, Downtown',       null),
--   ('<citizen-uuid>', 'Bulk',    'Pending',     current_date + 5, '34 Maple Ave, Riverside',       'Large furniture set'),
--   ('<citizen-uuid>', 'Special', 'Completed',   current_date - 3, '78 Pine Rd, University District', 'Electronics recycling'),
--   ('<citizen-uuid>', 'Regular', 'Missed',      current_date - 7, '5 Elm Court, Suburban',         null);
