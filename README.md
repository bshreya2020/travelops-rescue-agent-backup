This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Live Indian flight search with SerpApi

1. Create an account and API key at [SerpApi](https://serpapi.com).
2. Copy `.env.example` to `.env.local` and add your private `SERPAPI_KEY`.
3. Run `npm install` and then `npm run dev` from `frontend`.
4. In the trip form, type at least two letters and choose an Indian airport suggestion. Towns without an airport show nearby-airport suggestions.

The search sends the selected airport IATA code to SerpApi from the server only. It searches Google Flights in the Indian market, in INR, and requests direct plus connecting itineraries. The app deliberately shows no generated/mock fare if the provider fails.

### Live Indian Railways schedules (RailRadar)

Add `RAILRADAR_API_KEY` to `.env.local` to combine RailRadar train schedules with flight results. The app resolves the selected city to a rail station, expands the search to city-wide station pairs, and displays live schedule/delay details. RailRadar's trains-between-stations endpoint does not supply a verified ticket fare in this integration, so train cards deliberately show **Fare unavailable** rather than a made-up price.

SerpApi is a flight-search API, not an Indian Railways inventory API. Keep train search as a separate integration: use an authorised Indian rail provider/API with station autocomplete and route/availability endpoints before claiming live railway results.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
