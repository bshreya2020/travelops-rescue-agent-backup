import { NextRequest, NextResponse } from 'next/server';
import { searchSerpApiFlights, suggestIndianPlaces } from '@/services/serpApiService';
import { searchRailRadarRoutes } from '@/services/railRadarService';
import { searchBusRoutes } from '@/services/busService';
import type { TravelCrisis, TravelRoute } from '@/types/travel';

/** Live Google Flights search through SerpApi using selected Indian airport codes. */
export async function POST(request: NextRequest) {
  try {
    const { crisis, originCode, destinationCode } = await request.json() as {
      crisis: TravelCrisis; originCode?: string; destinationCode?: string;
    };
    if (!crisis?.origin || !crisis?.destination) {
      return NextResponse.json({ error: 'Choose an origin and destination.' }, { status: 400 });
    }
    const resolve = async (text: string, code?: string) => {
      if (code) return code;
      const selectedCode = text.match(/\(([A-Z]{3})\)\s*$/)?.[1];
      if (selectedCode) return selectedCode;
      const places = await suggestIndianPlaces(text);
      const normalized = text.trim().toLowerCase();
      const match = places.find((place) => place.iataCode.toLowerCase() === normalized)
        ?? places.find((place) => place.name.toLowerCase() === normalized || place.cityName?.toLowerCase() === normalized)
        ?? places[0];
      if (!match) throw new Error(`No Indian airport or city found for "${text}". Select a suggestion.`);
      return match.iataCode;
    };
    const [origin, destination] = await Promise.all([resolve(crisis.origin, originCode ?? crisis.originCode), resolve(crisis.destination, destinationCode ?? crisis.destinationCode)]);
    if (origin === destination) return NextResponse.json({ error: 'Origin and destination must be different.' }, { status: 400 });

    const flightRoutes = await searchSerpApiFlights(crisis, origin, destination);
    // Rail is optional: a missing/failed rail provider must never hide valid flights.
    let railWarning: string | undefined;
    const railRoutes = await searchRailRadarRoutes(crisis).catch((error) => {
      railWarning = `Train results unavailable: ${(error as Error).message}`;
      console.warn('[TravelOps] RailRadar search skipped:', (error as Error).message);
      return [];
    });
    let busWarning: string | undefined;
    const busRoutes = crisis.preferences.avoidBus ? [] : await searchBusRoutes(crisis).catch((error) => {
      busWarning = `Bus results unavailable: ${(error as Error).message}`;
      console.warn('[TravelOps] AbhiBus search failed:', (error as Error).message);
      return [] as TravelRoute[];
    });
    if (!railWarning && !process.env.RAILRADAR_API_KEY) {
      railWarning = 'Train results unavailable: add RAILRADAR_API_KEY to .env.local, then restart the development server.';
    } else if (!railWarning && railRoutes.length === 0) {
      railWarning = `RailRadar returned no direct train schedules for ${crisis.origin} → ${crisis.destination} on ${crisis.departureDate ?? 'the selected date'}. Try another future date or nearby city/station.`;
    }
    if (!busWarning && !crisis.preferences.avoidBus && busRoutes.length === 0) {
      busWarning = `AbhiBus returned no direct bus schedules for ${crisis.origin} → ${crisis.destination} on ${crisis.departureDate ?? 'the selected date'}.`;
    }
    const routes = [...flightRoutes, ...railRoutes, ...busRoutes].sort((a, b) => b.score - a.score);
    return NextResponse.json({
      routes, totalFound: routes.length,
      eliminated: routes.filter((route) => route.status === 'rejected').length,
      viable: routes.filter((route) => route.status === 'viable').length,
      recommended: routes.filter((route) => route.status === 'recommended').length,
      source: 'serpapi', hubs: null,
      providerWarnings: [railWarning, busWarning].filter((warning): warning is string => Boolean(warning)),
      search: { origin, destination, maxConnections: 1 },
    });
  } catch (error) {
    const message = (error as Error).message;
    console.error('[TravelOps] SerpApi search failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
