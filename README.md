# Trip Planner

A dependency-free web trip planner and budget tracker for a shared trip. It works locally first, then switches to Supabase online storage when configured.

## Preview

PowerShell blocks the `npm` shim on this machine, so this project does not require npm to preview.

Run:

```powershell
node server.mjs
```

Then open:

```text
http://localhost:5173
```

If port `5173` is busy, run ` $env:PORT=5174; node server.mjs ` instead.

The app will create a shareable trip URL like:

```text
http://localhost:5173/trip/trip-abc12345
```

## Current Features

- Budget summary with estimated, actual, remaining, and category totals
- Add, edit, and delete expenses
- Expense fields for name, category, estimated cost, actual cost, notes, link, and status
- Places and links page for hotels, restaurants, flights, activities, maps, social recommendations, and articles
- Itinerary planner grouped by date and time
- Comparison page for trip options such as Bali, Bandung, and Lombok
- Activity log
- Local browser storage fallback
- Supabase online persistence when configured

## Supabase Setup

Create a Supabase project, then open the SQL editor and run the full contents of:

```text
supabase-schema.sql
```

That creates these tables:

- `trips`
- `expenses`
- `places`
- `itinerary_items`
- `plan_options`
- `activity_log`

It also enables row-level security. The policies allow anonymous users to read and edit only the trip ID that the app sends from the shared URL. No login is required; the trip ID is effectively the access key.

## Environment Variables

Copy `.env.example` to `.env` for local preview:

```powershell
Copy-Item .env.example .env
```

Then fill in:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Use the Supabase anon public key, not the service role key.

The local preview server reads `.env` automatically. If those values are missing, the app clearly says online sharing is not connected and keeps saving locally.

## Vercel Later

This repo is prepared for Vercel:

- `vercel.json` rewrites `/trip/:id` links back to the app.
- `api/config.js` exposes only the public Supabase URL and anon key to the browser.
- Add the same environment variables in Vercel Project Settings:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

No build command is required for the current static version.

Recommended Vercel project settings:

- Framework Preset: `Other`
- Root Directory: project root
- Build Command: leave empty
- Output Directory: leave empty
- Install Command: leave empty

Before deploying, make sure Supabase has already run `supabase-schema.sql`.

Deployment steps:

1. Push this project to GitHub.
2. In Vercel, choose `Add New...` then `Project`.
3. Import the GitHub repository.
4. Use the project settings above.
5. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Environment Variables.
6. Deploy.
7. Open the deployed URL. It should redirect to a shared trip URL like `/trip/trip-abc12345`.
8. Share that `/trip/...` link with anyone who should view or edit the trip.

## Later

- Add realtime updates so two people editing at once see changes immediately
- Deploy the static app to Vercel
