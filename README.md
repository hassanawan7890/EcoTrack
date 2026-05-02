# EcoTrack

EcoTrack is a municipal waste and recycling management platform built with Next.js and Supabase. It includes separate dashboards for citizens, crew members, recycling staff, and administrators.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS
- Supabase Auth + PostgreSQL + Row Level Security
- Leaflet for map-based zones and routes
- Recharts for analytics

## License

MIT

## Features

- Role-based dashboards for `admin`, `citizen`, `crew`, and `staff`
- Supabase-backed authentication and profile management
- Pickup scheduling and status tracking
- Complaint submission and admin resolution workflow
- Crew issue reporting
- Staff load and contamination logging
- Admin tools for users, zones, routes, and reporting

## Demo Accounts

The login screen includes quick-fill demo account buttons. If you want those shortcuts to work in your environment, create matching Supabase users and set their roles in the `profiles` table:

- `admin@ecotrack.com` / `demo1234` / role `admin`
- `citizen@ecotrack.com` / `demo1234` / role `citizen`
- `crew@ecotrack.com` / `demo1234` / role `crew`
- `staff@ecotrack.com` / `demo1234` / role `staff`

## Local Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill in your Supabase values:
   `NEXT_PUBLIC_SITE_URL`
   `NEXT_PUBLIC_SUPABASE_URL`
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   `SUPABASE_SERVICE_ROLE_KEY`
4. Run `supabase/schema.sql` in the Supabase SQL editor.
5. If you already have an older EcoTrack database, also run `supabase/migrations/20260501_align_app_schema.sql`.
6. Optionally run `supabase/seed.sql` for base reference data.
7. Start the app with `npm run dev`.

## Scripts

- `npm run dev` starts the local Next.js dev server.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript checks.
- `npm run build` creates a production build.
- `npm run check` runs typecheck, lint, and build in sequence.

## Supabase Notes

- `supabase/schema.sql` is the canonical database definition for this project.
- `database/ecotrack.sql` is a legacy MySQL dump kept only for reference.
- This app expects PostgreSQL tables and columns for zone boundaries, route waypoints, complaint resolution notes, and issue status/admin notes.

## Deploying To Vercel

1. Push this project to a GitHub repository.
2. Import that repository into Vercel.
3. Set the same environment variables from `.env.local` inside the Vercel project settings.
4. Set `NEXT_PUBLIC_SITE_URL` to your production URL, for example `https://your-project.vercel.app`.
5. Deploy.

## GitHub Pages

GitHub Pages is not a good fit for the current architecture. EcoTrack uses Next.js middleware, server-rendered routes, and API endpoints, so it should be deployed to Vercel or another platform that supports full Next.js server features.

## Production Checklist

- Confirm the Supabase project uses the latest schema and migration.
- Create or seed the demo accounts if you want the login shortcuts to work.
- Verify `npm run check` passes before pushing.
- Rotate any Supabase keys if they were ever exposed outside your private environment.
