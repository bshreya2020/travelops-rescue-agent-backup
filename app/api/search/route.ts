import { NextRequest, NextResponse } from 'next/server';
import {
  searchSerpApiFlights,
  suggestIndianPlaces,
} from '@/services/serpApiService';
import { searchRailRadarRoutes } from '@/services/railRadarService';
import { searchBusRoutes } from '@/services/busService';
import { generateRoutes } from '@/services/routeEngine';
import type { TravelCrisis, TravelRoute } from '@/types/travel';

// Errors that are "expected" coverage gaps — not real failures worth surfacing.
function isExpectedError(message: string): boolean {
  return (
    message.includes('same airport') ||
    message.includes('No airport was found') ||
    message.includes('did not offer') ||
    message.includes('QuickJS') ||
    message.includes('did not show') ||
    message.includes('not available in the AbhiBus') ||
    message.includes('no visible bus') ||
    message.includes('returned no trains') ||
    message.includes('returned no direct')
  );
}

export async function POST(request: NextRequest) {
  try {
    const { crisis, originCode, destinationCode } =
      (await request.json()) as {
        crisis: TravelCrisis;
        originCode?: string;
        destinationCode?: string;
      };

    if (!crisis?.origin || !crisis?.destination) {
      return NextResponse.json(
        { error: 'Choose an origin and destination.' },
        { status: 400 }
      );
    }

    const resolveAirport = async (text: string, code?: string) => {
      if (code) return code;
      const selectedCode = text.match(/\(([A-Z]{3})\)\s*$/)?.[1];
      if (selectedCode) return selectedCode;
      const places = await suggestIndianPlaces(text);
      const normalized = text.trim().toLowerCase();
      const match =
        places.find((p) => p.iataCode.toLowerCase() === normalized) ??
        places.find(
          (p) =>
            p.name.toLowerCase() === normalized ||
            p.cityName?.toLowerCase() === normalized
        ) ??
        places[0];
      if (!match) throw new Error(`No airport found for "${text}".`);
      return match.iataCode;
    };

    let resolvedOrigin: string | undefined;
    let resolvedDestination: string | undefined;

    // ── Flights ──────────────────────────────────────────────
    const flightRoutes = await (async (): Promise<TravelRoute[]> => {
      // No key → no real search, no warning
      if (!process.env.SERPAPI_KEY) return [];
      try {
        const [origin, destination] = await Promise.all([
          resolveAirport(crisis.origin, originCode ?? crisis.originCode),
          resolveAirport(crisis.destination, destinationCode ?? crisis.destinationCode),
        ]);
        resolvedOrigin = origin;
        resolvedDestination = destination;
        // Cities that share an airport can't have flights between them
        if (origin === destination) return [];
        return await searchSerpApiFlights(crisis, origin, destination);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown flight error';
        // Only log real unexpected API failures
        if (!isExpectedError(message)) {
          console.warn('[TravelOps] Flight search error:', message);
        }
        return [];
      }
    })();

    // ── Trains ───────────────────────────────────────────────
    const railRoutes = await (async (): Promise<TravelRoute[]> => {
      // No key → no real search, no warning
      if (!process.env.RAILRADAR_API_KEY) return [];
      try {
        return await searchRailRadarRoutes(crisis);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown rail error';
        if (!isExpectedError(message)) {
          console.warn('[TravelOps] Rail search error:', message);
        }
        return [];
      }
    })();

    // ── Buses ────────────────────────────────────────────────
    const busRoutes = await (async (): Promise<TravelRoute[]> => {
      if (crisis.preferences.avoidBus) return [];
      try {
        return await searchBusRoutes(crisis);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown bus error';
        if (!isExpectedError(message)) {
          console.warn('[TravelOps] Bus search error:', message);
        }
        return [];
      }
    })();

    const liveRoutes = [...flightRoutes, ...railRoutes, ...busRoutes].sort(
      (a, b) => b.score - a.score
    );

    // For any mode that returned 0 live results, fill in with generated demo
    // routes so the UI always shows all three transport types.
    const generated = generateRoutes(crisis);

    const mergedFlights = flightRoutes.length > 0
      ? flightRoutes
      : generated.routes.filter((r) => r.primaryMode === 'flight');

    const mergedTrains = railRoutes.length > 0
      ? railRoutes
      : generated.routes.filter((r) => r.primaryMode === 'train');

    const mergedBuses = busRoutes.length > 0 || crisis.preferences.avoidBus
      ? busRoutes
      : generated.routes.filter((r) => r.primaryMode === 'bus');

    const routes = [...mergedFlights, ...mergedTrains, ...mergedBuses].sort(
      (a, b) => b.score - a.score
    );

    const source = flightRoutes.length > 0 || railRoutes.length > 0 || busRoutes.length > 0
      ? 'serpapi'
      : 'demo';

    return NextResponse.json({
      routes,
      totalFound: routes.length,
      eliminated: routes.filter((r) => r.status === 'rejected').length,
      viable: routes.filter((r) => r.status === 'viable').length,
      recommended: routes.filter((r) => r.status === 'recommended').length,
      source,
      hubs: null,
      providerWarnings: [],
      search: {
        origin: resolvedOrigin ?? null,
        destination: resolvedDestination ?? null,
        maxConnections: 1,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown search error';
    console.error('[TravelOps] Search failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
