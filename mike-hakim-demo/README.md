# Mike Hakim Real Estate: interactive demo

A working demonstration of a custom real estate site for Mike Hakim (@mikehakimrealtor). Buyers search sample MLS-style listings, open full listing pages, request a showing with two times and a sample pre-approval letter, and then watch the automation Mike asked for (business email, Follow Up Boss, Google Calendar) run as a clearly labeled simulation. The Realtor View shows the same request in a dashboard with leads, a pipeline, showings, a calendar and automation logs.

**Demo Mode is always on.** Nothing is sent to an email provider, a CRM or a calendar. All data lives in the visitor's browser.

## Run it locally

Requires Node 20 or newer.

```bash
npm install
npm run dev            # http://localhost:3000
```

Production build:

```bash
npm run build
npm start              # http://localhost:3000
```

No API keys or environment variables are needed. Optional: `NEXT_PUBLIC_SITE_URL` sets the absolute URL used in link previews (defaults to `https://mike-hakim-demo.vercel.app`).

## Tests

End-to-end tests use Playwright (desktop at 1366×768 and an iPhone 13 profile).

```bash
npm run build
npx playwright test --trace off            # starts `next start` on :3100 automatically
BASE_URL=https://your-deploy.vercel.app npx playwright test --trace off   # test a deployed copy
```

They cover search, combined filters, sorting, favorites, the map, the gallery, the mortgage math, the whole showing wizard (validation, date and time, file type and size checks), a check that uploaded file bytes never reach storage, the automation run, the email preview, the CRM lead, the tentative calendar event, dashboard counts, status changes surviving a reload, Reset Demo, blocked storage, the guided tour, mobile navigation and forms, broken links and images, and bot blocking.

The site blocks AI crawlers, scrapers and headless browsers by User-Agent (`src/middleware.ts`), so the tests send a normal browser User-Agent.

## Deploy to Vercel

From this folder:

```bash
npx vercel            # preview
npx vercel --prod     # production
```

Or import the Git repository in the Vercel dashboard and set **Root Directory** to `mike-hakim-demo`. The framework is detected as Next.js. No environment variables are required.

## What's simulated

| Piece | In the demo | In production |
| --- | --- | --- |
| Listings | 30 fictional listings in real Southeast Michigan cities (`src/data/listings.ts`) | An authorized IDX/MLS feed returning the same `Listing` shape |
| Map | Leaflet with OpenStreetMap tiles, approximate pins | Same, or a licensed map provider |
| Showing request | Saved in localStorage | Saved server-side with spam protection |
| Pre-approval letter | Only name, type and size are kept. The file is never read or stored | Private storage with expiring links and automatic deletion |
| Email | A preview is generated and labeled "Simulated Email — Not Sent" | A delivery service or connected mailbox |
| Follow Up Boss | A lead record and sync log in the dashboard. The payload is shown, and no request is made | Authenticated server-side calls after verifying supported operations |
| Google Calendar | A tentative event on the built-in calendar | Google Calendar API with Mike's OAuth consent |

## Architecture

```
src/
  config/demo.ts           DEMO_MODE, timezone, placeholder contact details, upload limits
  lib/types.ts             shared types
  lib/search.ts            filter and sort engine, URL serialization
  lib/schemas.ts           Zod schemas for the showing request and questions
  lib/time.ts              America/Detroit helpers (DST-safe)
  lib/store.ts             versioned local demo store, actions, automation orchestration
  lib/storage.ts           storage wrapper that never throws
  data/listings.ts         sample listings (the listings repository)
  data/seed.ts             deterministic seed: 12 leads, 8 showings, 11 events, logs
  integrations/types.ts    adapter contracts (email, CRM, calendar)
  integrations/simulated/  simulated adapters (the only ones the registry returns)
  integrations/production/ inert placeholders that throw until implemented
  integrations/index.ts    registry gated by DEMO_MODE
  components/              site, listings, showing wizard, automation, dashboard, tour
  app/                     routes: / (search), /homes, /homes/[id], /requests/[ref], /dashboard/*
```

To go live with an integration, implement the adapter server-side (route handler plus secrets), add it to the registry and deliberately change `DEMO_MODE`. Nothing in this build can call a real service.

## Real integration requirements

- **MLS / IDX**: valid authorized MLS/IDX access and an approved integration method, which may involve eXp, BoldTrail or an authorized IDX vendor (the MLS is likely Realcomp).
- **Follow Up Boss**: Mike's API access or an approved integration, with the supported operations verified against Follow Up Boss's current API documentation.
- **Google Calendar**: a one-time Google sign-in from Mike granting calendar access, or an .ics invite attached to the notification email as a simpler first step.
- **Email**: an email delivery service or connected mailbox with a verified sending domain.

## Limitations

- Listings, prices, people and appointments are fictional. Cities and ZIP codes are real; street names are invented.
- Data is per browser. Another device won't see requests made here. Reset Demo restores the seed.
- Time slots are samples, not Mike's availability. A request is never a confirmed appointment.
- The dashboard has no login. It's a demo view only and must not be used with real personal information.
- Map tiles come from OpenStreetMap and need an internet connection. Pins still work without tiles.
- Phone number and email in the footer are placeholders.

## Credits

Property photos are from Unsplash, used under the Unsplash License. Map data © OpenStreetMap contributors. Fonts: Fraunces and Manrope (SIL Open Font License).
