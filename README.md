# Content Radar

Content Radar is a content intelligence and execution workflow dashboard built with Next.js App Router, Supabase, Tailwind CSS, and the YouTube Data API v3.

Phase 1 delivered the live in-session dashboard. Phase 2 adds persistent radar snapshots, snapshot-based trend history, and a secure scheduled refresh foundation.

Phase 3 adds a Remix Studio workflow for saving reference links, preparing original remix briefs, recommending music direction, and generating platform-ready publish copy without adding scraping, media downloading, OAuth, or auto-posting.

## What Phase 2 Added

### Persistent snapshot storage

New Supabase tables are created by:

- `supabase/migrations/20260420123000_phase2_radar_snapshots.sql`

Tables:

- `radar_snapshots`
- `creator_snapshots`
- `video_snapshots`

The design is append-only and snapshot-oriented:

- every persisted refresh creates one new `radar_snapshots` row
- creator analytics for that run are stored in `creator_snapshots`
- fetched videos for that run are stored in `video_snapshots`

### Shared refresh and history layer

New shared server utilities:

- `app/lib/env.ts`
- `app/lib/supabase-server.ts`
- `app/lib/youtube-api.ts`
- `app/lib/radar-refresh.ts`
- `app/lib/radar-history.ts`
- `app/lib/radar-history-server.ts`

These utilities:

- fetch tracked YouTube creators from Supabase
- fetch and score recent videos through one shared YouTube pipeline
- persist snapshot runs and snapshot children
- build snapshot history comparisons for the UI

### New API routes

- `app/api/youtube/recent/route.ts`
  - now uses the shared YouTube fetch/service layer
- `app/api/radar/history/route.ts`
  - returns snapshot history and comparison data
- `app/api/radar/refresh/route.ts`
  - manual refresh endpoint used by the dashboard UI
- `app/api/cron/refresh/route.ts`
  - secure scheduled refresh endpoint protected by `CRON_SECRET`

## Required Environment Variables

Add these to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
YOUTUBE_API_KEY=...
CRON_SECRET=...
```

Notes:

- `NEXT_PUBLIC_*` values are used by the browser client.
- `SUPABASE_SERVICE_ROLE_KEY` is required for server-side snapshot persistence and history reads.
- `CRON_SECRET` protects the scheduled refresh endpoint.
- Use `.env.example` as the local template, but never commit real secret values.

## Manual Refresh Persistence

The dashboard `Refresh Analytics` action now:

1. calls `POST /api/radar/refresh`
2. loads tracked YouTube creators on the server
3. fetches recent videos through the shared YouTube service
4. computes creator analytics and snapshot summary metrics
5. persists a new radar snapshot plus creator/video snapshot rows
6. returns updated live videos and refreshed history data back to the UI

Initial page load can still hydrate the dashboard from live YouTube fetches even if history is unavailable.

## Scheduled Refresh

The scheduled endpoint is:

- `GET /api/cron/refresh` for Vercel Cron
- `POST /api/cron/refresh` for local/manual checks

Authorization:

- send `x-cron-secret: <CRON_SECRET>`
- or `Authorization: Bearer <CRON_SECRET>`

What it does:

1. loads tracked YouTube creators from Supabase
2. fetches their recent videos
3. computes analytics
4. persists a new snapshot run
5. returns a structured JSON summary

Partial failures are allowed:

- if one creator fails, the run continues
- snapshot status becomes `partial`
- failure counts are included in the response and stored summary

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Run the Supabase migration

If you use the Supabase CLI:

```bash
supabase db push
```

Or apply the migration file manually in Supabase SQL editor:

- `supabase/migrations/20260420123000_phase2_radar_snapshots.sql`
- `supabase/migrations/20260422090000_phase3_content_intake_queue.sql`

### 3. Start the app

```bash
npm run dev
```

### 4. Trigger a manual persisted refresh

Use the `Refresh Analytics` button in the dashboard.

### 5. Trigger the scheduled endpoint locally

Example with `curl`:

```bash
curl http://localhost:3000/api/cron/refresh \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Vercel Cron

`vercel.json` registers the scheduled refresh:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This runs the radar refresh every 6 hours. In Vercel, set `CRON_SECRET`; Vercel sends it as an `Authorization` header when invoking the cron path.

## UI Additions in Phase 2

The dashboard now includes:

- snapshot health
- latest refresh status
- since-last-snapshot comparisons
- creator trend deltas
- recent snapshot list

These are snapshot-based comparisons, not streaming metrics.

## What Phase 3 Added

### Content intake persistence

New Supabase tables are created by:

- `supabase/migrations/20260422090000_phase3_content_intake_queue.sql`

Tables:

- `content_intake_items`
- `content_queue_items`

The model is intentionally simple and extensible:

- intake items store source URL, detected source platform, metadata, notes, tags, status, and analysis JSON
- queue items store workflow stage, target platforms, remix brief JSON, music supervisor JSON, and publish assist JSON
- unsupported metadata fetches do not block saving the source link

### Remix Studio workflow

The dashboard now includes an `Intake + Remix Studio` section:

1. paste a reference link
2. detect the source platform from the URL
3. safely fetch lightweight YouTube oEmbed metadata when available
4. save notes and tags
5. analyze the item into structured operator notes
6. move it into the execution queue
7. generate music direction and publish assist copy
8. move the item through `Idea`, `Drafting`, `Ready`, `Posted`, and `Archived`

### New Phase 3 helper modules

- `app/lib/content-intake.ts`
- `app/lib/content-intake-server.ts`
- `app/lib/remix-engine.ts`
- `app/lib/music-supervisor.ts`
- `app/lib/publish-assist.ts`

These modules keep workflow logic centralized and avoid duplicating radar scoring, benchmark, or insight formulas.

### New Phase 3 API routes

- `app/api/content-intake/route.ts`
  - loads the intake board and saves new reference links
- `app/api/content-intake/[id]/route.ts`
  - updates intake item notes, tags, or status
- `app/api/content-intake/[id]/analyze/route.ts`
  - analyzes a saved item into structured operator notes
- `app/api/content-intake/[id]/queue/route.ts`
  - moves an item into the execution queue and generates remix/music/publish outputs
- `app/api/content-queue/[id]/route.ts`
  - updates queue stage or target platform selections
- `app/api/content-queue/[id]/music/route.ts`
  - refreshes music supervisor recommendations
- `app/api/content-queue/[id]/publish/route.ts`
  - refreshes platform-ready publish assist blocks

### AI Music Supervisor

The music supervisor is a recommendation framework, not a music hosting or trending-audio scraping feature. It uses a pragmatic starter catalog plus saved item context, tags, and remix brief signals to produce:

- tone analysis
- pacing analysis
- energy analysis
- visual style analysis
- categorized song suggestions
- reasoning and edit-use notes

### Publish Assist

Publish Assist generates copy-prep blocks for:

- X
- YouTube Shorts
- Instagram Reels
- TikTok
- Facebook Video

It produces titles, captions, hashtags, CTA direction, and platform framing. It does not post, schedule, upload media, store OAuth tokens, or call social publishing APIs.

## Production Notes

- The client app does not use shell execution, `child_process`, Playwright, or clipboard automation.
- Snapshot persistence depends on `SUPABASE_SERVICE_ROLE_KEY`.
- Scheduled refreshes are designed to be easy to wire into Vercel Cron later.
- Manual refresh remains available directly from the UI because the current app has no auth layer yet.
- Phase 3 intake persistence also depends on `SUPABASE_SERVICE_ROLE_KEY` because server routes write intake and queue records.
- Metadata fetches are intentionally conservative. YouTube oEmbed is supported; unsupported platforms still save as links with operator notes.

## Known Limitations

- Snapshot history is currently YouTube-only.
- Manual refresh persistence is unauthenticated because the app still has no user/auth system.
- Trend views are intentionally lightweight and table/card-based, not heavy charting.
- If service-role or cron secrets are missing, history and scheduled refresh endpoints fail safely with clear errors.
- Intake metadata is lightweight. The app does not scrape TikTok, Instagram, Facebook, X, or arbitrary websites.
- Remix briefs, music recommendations, and publish assist outputs are deterministic workflow helpers, not AI-generated final creative assets.
- Full auto-posting, platform OAuth, post scheduling, and media download/rehosting are intentionally out of scope.
