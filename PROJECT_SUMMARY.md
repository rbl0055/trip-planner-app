# Project Summary

## What This App Does

This is a shared web-based trip planner and budget tracker for a couple planning a trip. Anyone with the trip link can view and edit the same trip without logging in.

The app tracks expenses, saved places/links, itinerary items, destination comparisons, and an activity log.

## Current Tech Stack

- Frontend: Vite, vanilla JavaScript, HTML, CSS
- Hosting: Vercel
- Database: Supabase Postgres through Supabase REST API
- Auth: no login; access is controlled by the shared trip slug in the URL
- Local fallback: browser `localStorage`

## Current Supabase Setup

Supabase stores trip data in these tables:

- `trips`
- `expenses`
- `places`
- `itinerary_items`
- `plan_options`
- `activity_log`

The schema lives in `supabase-schema.sql`.

Row-level security is enabled. Anonymous users can read and edit rows for the trip ID sent by the app in the `x-trip-id` request header.

Environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The local `.env` file is ignored by Git.

## Current Vercel Setup

Vercel builds the app with Vite.

Current `vercel.json` behavior:

- Build command: `npm run build`
- Output directory: `dist`
- Redirects `/trip/trip-4b2347c8` to `/trip/indonesia-2026`
- Rewrites `/trip/:id*` to `/index.html` so refresh works on shared trip links

The serverless API route `api/config.js` exposes the public Supabase URL and anon key to the browser.

## Important Routes

- `/` redirects in the browser to the default trip slug
- `/trip/indonesia-2026` is the current clean shared trip URL
- `/trip/trip-4b2347c8` is the old trip URL and redirects to the new slug
- `/api/config` returns Supabase public config for the app

## Current Working Features

- Shared trip link with no login
- Supabase online persistence
- Local fallback storage when Supabase is not configured
- Expense list with add, edit, delete
- Expense fields: name, category, estimated cost, actual cost, notes, link, status
- Budget totals: estimated, actual, remaining, category totals
- Places/links page
- Itinerary planner by date/time
- Compare plans page
- Activity log
- Vercel refresh support for `/trip/:id` links
- Custom canonical trip slug: `indonesia-2026`

## Known Issues

- No realtime sync yet; if two people edit at the same time, the later save may overwrite earlier changes.
- No built-in UI for changing the trip slug; the current alias is configured in code.
- The shared trip slug acts like the access key, so anyone with the link can edit.
- Activity log is basic and records app actions, not detailed field-level diffs.

## Recent Fixes

- Converted the project to a proper Vite app so Vercel serves bundled JS/CSS assets correctly.
- Fixed Vercel refresh blank screen on `/trip/:id`.
- Fixed unusable form inputs caused by the global click handler reacting to parent forms.
- Added safer Supabase fallback/default handling for partial data.
- Removed `#budget` from default shared link behavior.
- Added `indonesia-2026` as the canonical trip slug.
- Safely copied existing Supabase data from `trip-4b2347c8` to `indonesia-2026` without deleting the old trip.

## Next Planned Improvements

- Add realtime Supabase subscriptions so multiple people see edits immediately.
- Add a small trip settings screen for changing the trip name, travelers, budget, and slug.
- Add conflict protection for simultaneous edits.
- Add export options for budget and itinerary.
- Add sorting/filtering for expenses and places.
- Add richer activity log entries.
