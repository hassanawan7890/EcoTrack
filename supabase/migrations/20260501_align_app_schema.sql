alter table public.zones
  add column if not exists coordinates jsonb;

alter table public.routes
  add column if not exists path_coordinates jsonb;

alter table public.complaints
  add column if not exists pickup_id integer references public.pickup_requests(id) on delete set null,
  add column if not exists resolution_notes text;

alter table public.issue_reports
  add column if not exists status text not null default 'Open',
  add column if not exists admin_notes text;

alter table public.issue_reports
  drop constraint if exists issue_reports_status_check;

alter table public.issue_reports
  add constraint issue_reports_status_check
  check (status in ('Open', 'Reviewed', 'Closed'));

create index if not exists idx_complaint_pickup on public.complaints(pickup_id);
create index if not exists idx_issue_status on public.issue_reports(status);
