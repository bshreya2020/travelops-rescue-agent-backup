import { NextRequest, NextResponse } from 'next/server';
import {
  searchSerpApiFlights,
  suggestIndianPlaces,
} from '@/services/serpApiService';
import { searchRailRadarRoutes } from '@/services/railRadarService';
import { searchBusRoutes } from '@/services/busService';
import type { TravelCrisis, TravelRoute } from '@/types/travel';

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
        places.find(
          (place) => place.iataCode.toLowerCase() === normalized
        ) ??
        places.find(
          (place) =>
            place.name.toLowerCase() === normalized ||
            place.cityName?.toLowerCase() === normalized
        ) ??
        places[0];

      if (!match) {
        throw new Error(
          `No airport was found for "${text}". Flights were skipped, but train and bus searches will continue.`
        );
      }

      return match.iataCode;
    };

    let flightWarning: string | undefined;
    let railWarning: string | undefined;
    let busWarning: string | undefined;

    let resolvedOrigin: string | undefined;
    let resolvedDestination: string | undefined;

    // Flights are optional. They must never stop train or bus searches.
    const flightRoutes = await (async (): Promise<TravelRoute[]> => {
      try {
        const [origin, destination] = await Promise.all([
          resolveAirport(crisis.origin, originCode ?? crisis.originCode),
          resolveAirport(
            crisis.destination,
            destinationCode ?? crisis.destinationCode
          ),
        ]);

        resolvedOrigin = origin;
        resolvedDestination = destination;

        if (origin === destination) {
          throw new Error(
            'Origin and destination resolved to the same airport.'
          );
        }

        return await searchSerpApiFlights(crisis, origin, destination);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown flight error';

        flightWarning = `Flight results unavailable: ${message}`;

        console.warn(
          '[TravelOps] Google Flights search skipped:',
          message
        );

        return [];
      }
    })();

    // Rail is optional.
    const railRoutes = await searchRailRadarRoutes(crisis).catch(
      (error) => {
        const message =
          error instanceof Error ? error.message : 'Unknown rail error';

        railWarning = `Train results unavailable: ${message}`;

        console.warn(
          '[TravelOps] RailRadar search skipped:',
          message
        );

        return [] as TravelRoute[];
      }
    );

    // Bus is optional.
    const busRoutes = crisis.preferences.avoidBus
      ? []
      : await searchBusRoutes(crisis).catch((error) => {
          const message =
            error instanceof Error ? error.message : 'Unknown bus error';

          busWarning = `Bus results unavailable: ${message}`;

          console.warn(
            '[TravelOps] AbhiBus search skipped:',
            message
          );

          return [] as TravelRoute[];
        });

    if (!railWarning && !process.env.RAILRADAR_API_KEY) {
      railWarning =
        'Train results unavailable: add RAILRADAR_API_KEY to .env.local, then restart the development server.';
    } else if (!railWarning && railRoutes.length === 0) {
      railWarning = `RailRadar returned no direct train schedules for ${crisis.origin} → ${crisis.destination} on ${
        crisis.departureDate ?? 'the selected date'
      }.`;
    }

    if (
      !busWarning &&
      !crisis.preferences.avoidBus &&
      busRoutes.length === 0
    ) {
      busWarning = `AbhiBus returned no direct bus schedules for ${crisis.origin} → ${crisis.destination} on ${
        crisis.departureDate ?? 'the selected date'
      }.`;
    }

    const routes = [...flightRoutes, ...railRoutes, ...busRoutes].sort(
      (first, second) => second.score - first.score
    );

    return NextResponse.json({
      routes,
      totalFound: routes.length,
      eliminated: routes.filter((route) => route.status === 'rejected')
        .length,
      viable: routes.filter((route) => route.status === 'viable').length,
      recommended: routes.filter(
        (route) => route.status === 'recommended'
      ).length,
      source: 'serpapi',
      hubs: null,
      providerWarnings: [flightWarning, railWarning, busWarning].filter(
        (warning): warning is string => Boolean(warning)
      ),
      search: {
        origin: resolvedOrigin ?? null,
        destination: resolvedDestination ?? null,
        maxConnections: 1,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown search error';

    console.error('[TravelOps] Search failed:', message);

    return NextResponse.json({ error: message }, { status: 502 });
  }
}