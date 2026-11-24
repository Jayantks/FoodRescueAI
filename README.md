# FoodRescue AI

FoodRescue AI is an academic prototype for coordinating surplus food donations, time-constrained NGO matching, pickup tracking, and redistribution reporting.

## Run locally

Install Node.js 22.12 or later, then run:

```sh
npm install
npm run dev
```

Open [FoodRescue AI](http://127.0.0.1:5173/). The command starts the Vite frontend on port 5173 and the Express API on port 3001. Select **Demo accounts** on the sign-in page to fill the credentials for a sample account, or enter them directly.

| Workspace | Email | Demo password |
| --- | --- | --- |
| Donor | donor@foodrescue.demo | DonorDemo!26 |
| NGO | ngo@foodrescue.demo | NgoDemo!26 |
| Volunteer | volunteer@foodrescue.demo | VolunteerDemo!26 |
| Administrator | admin@foodrescue.demo | AdminDemo!26 |

Express checks the supplied credentials with bcrypt and sets a signed, HTTP-only session cookie. The account determines the workspace and navigation. Use **Sign out** before opening another account. The local API restart ends active sessions.

## Project layout

| Directory | Purpose |
| --- | --- |
| `apps/web` | Responsive React login, role dashboards, pickup map, and browser demo workflows |
| `apps/api` | Express health, login, session, and logout endpoints |
| `packages/matching` | Shared, weighted NGO ranking logic |
| `database/migrations` | Existing migration scaffold |
| `evaluation` | Benchmark protocol |

Run `npm run check`, `npm test`, and `npm run build` to verify the workspace. After building, `npm start` serves the compiled app and API together at `http://127.0.0.1:3001/`. The health endpoint is `/api/health`.

The accounts are for local demonstration. Donation, allocation, demand, and pickup actions use fictional data stored in the current browser. MongoDB persistence, public registration, the FastAPI optimiser, and forecasting described in the PRD are future integration work.


## Dashboard image
<img width="1917" height="908" alt="image" src="https://github.com/user-attachments/assets/d0b1823b-d807-4e38-8429-111df4dd37c0" />


## Pickup map

Open **Pickups** and select **Map**. The Active and History filters apply to both views. Map pins show approximate positions for the demo’s predefined Delhi areas. Pickups with an unrecognized area stay accessible in the stop list.

The self-hosted Delhi vector archive is a regional extract of the [2026-11-18 Protomaps basemap](https://maps.protomaps.com/builds/), produced from [OpenStreetMap data under the ODbL](https://www.openstreetmap.org/copyright). The local Noto Sans glyphs come from [Protomaps basemap assets](https://github.com/protomaps/basemaps-assets) under the SIL Open Font License. Attribution is also visible in the map. Serve the archive from the application origin with HTTP byte-range support.

To refresh the regional extract using the [PMTiles CLI](https://docs.protomaps.com/pmtiles/cli), replace the dated archive URL with a current build:

    pmtiles extract https://build.protomaps.com/20261118.pmtiles apps/web/public/maps/delhi.pmtiles --bbox=76.93,28.44,77.46,28.82 --minzoom=10 --maxzoom=13

