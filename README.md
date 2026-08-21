# TravelOps Rescue Agent

TravelOps is a multimodal travel crisis planning app for disrupted trips. It helps travellers re-plan after a cancelled flight, delayed train, missed connection, or other urgent disruption by comparing flight, rail, and bus options against budget, deadline, risk, and passenger needs.

The app is built with Next.js and presents a crisis-first UI that gathers the disruption details, searches multiple transport providers, ranks viable routes, and helps users choose the safest recovery option.

## What it does

- Captures crisis details such as trip type, origin, destination, departure date, deadlines, passengers, and budget
- Recommends recovery routes across flights, Indian rail, and bus alternatives
- Resolves city names into airport or station suggestions for Indian locations
- Evaluates options on speed, cost, transfers, risk, and deadline fit
- Shows warnings when a live provider is unavailable or a fare is not verified
- Saves selected trip outcomes in local browser storage for recent rescue history

## At a glance

- Travel disruption triage for urgent route replanning
- Multimodal search across flights, rail, and bus options
- Deadline-focused recommendation scoring
- Indian market airport and city resolution
- Browser-assisted fallback when structured APIs are incomplete

## Core features

- Live Indian flight search through SerpApi (server-side only)
- Live Indian rail schedule discovery through RailRadar
- Bus route discovery via a bus provider flow
- Airport and city suggestions for Indian destinations
- Route scoring and recommendation logic tuned for urgent travel scenarios
- Demo mode and rescued-trip history for quick exploration

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- RailKit and provider integrations for route lookup

## Project structure

- app/ — App router pages and API routes
- components/ — UI, dashboard, and crisis flow components
- services/ — transport search, route generation, and provider adapters
- store/ — crisis state management
- types/ — shared travel and route models
- lib/ — demo data and app utilities

## Getting started

### Prerequisites

- Node.js 18+ or newer
- npm

### Install dependencies

```bash
npm install
```

### Environment variables

Create a file named `.env.local` in the project root and add the needed providers.

```bash
SERPAPI_KEY=your_serpapi_key
RAILRADAR_API_KEY=your_railradar_key
```

Notes:

- `SERPAPI_KEY` is used for Google Flights search in the Indian market.
- `RAILRADAR_API_KEY` enables live rail schedule checks.
- The app is designed so flight and train searches can fail gracefully without blocking the rest of the rescue flow.

### Run the app

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Important provider notes

This project uses live provider integrations for planning support, not a booking engine.

- SerpApi powers live flight discovery and should be treated as a search provider.
- RailRadar is used for Indian rail schedule checks and may not provide a verified ticket fare in all responses.
- Route cards indicate when a price is unavailable rather than inventing a fare.
- The app intentionally keeps provider failures visible through warnings instead of silently fabricating data.

## Useful scripts

```bash
npm run dev      # start local development server
npm run build    # create production build
npm run start    # run production build locally
npm run lint     # run ESLint checks
```

## How the flow works

```text
Crisis form
   ↓
Search request
   ↓
Resolve origin/destination
   ↓
Flight + rail + bus search
   ↓
Score and rank viable routes
   ↓
Recommend the best rescue option
```

## Notes for contributors

- The crisis flow begins in the crisis form and drives the search request to the API route in app/api/search/route.ts.
- Provider implementations live under services/ and are the right place to add or adjust live transport integrations.
- The UI is intentionally designed around an emergency response workflow rather than a shopping flow, so route scoring focuses on speed, confidence, and deadline fit.

## License

This project is currently unlicensed and intended for internal or experimental use unless otherwise specified by the repository owner.
