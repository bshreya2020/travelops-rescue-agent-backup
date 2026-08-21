import type { TravelCrisis, TravelRoute } from '@/types/travel';

const BASE_URL = 'https://api.railradar.in/v1';

type Station = { code: string; name: string; city?: string };
// Prioritise the principal long-distance stations in major metros. Dynamic
// RailRadar autocomplete still handles every other Indian city.
const CITY_STATION_HINTS: Record<string, Station[]> = {
  kolkata: [{ code: 'HWH', name: 'Howrah Junction', city: 'Kolkata' }, { code: 'SDAH', name: 'Sealdah', city: 'Kolkata' }, { code: 'KOAA', name: 'Kolkata Terminal', city: 'Kolkata' }],
  bhubaneswar: [{ code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar' }],
  'new delhi': [{ code: 'NDLS', name: 'New Delhi', city: 'New Delhi' }, { code: 'NZM', name: 'Hazrat Nizamuddin', city: 'New Delhi' }, { code: 'DLI', name: 'Old Delhi Junction', city: 'New Delhi' }],
  delhi: [{ code: 'NDLS', name: 'New Delhi', city: 'Delhi' }, { code: 'NZM', name: 'Hazrat Nizamuddin', city: 'Delhi' }, { code: 'DLI', name: 'Old Delhi Junction', city: 'Delhi' }],
  mumbai: [{ code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus', city: 'Mumbai' }, { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai' }, { code: 'BDTS', name: 'Bandra Terminus', city: 'Mumbai' }],
  bengaluru: [{ code: 'SBC', name: 'KSR Bengaluru', city: 'Bengaluru' }, { code: 'YPR', name: 'Yesvantpur Junction', city: 'Bengaluru' }],
  chennai: [{ code: 'MAS', name: 'Chennai Central', city: 'Chennai' }, { code: 'TBM', name: 'Tambaram', city: 'Chennai' }],
  hyderabad: [{ code: 'SC', name: 'Secunderabad Junction', city: 'Hyderabad' }, { code: 'KCG', name: 'Kacheguda', city: 'Hyderabad' }], siliguri: [
    {
      code: 'NJP',
      name: 'New Jalpaiguri Junction',
      city: 'Siliguri',
    },
    {
      code: 'SGUJ',
      name: 'Siliguri Junction',
      city: 'Siliguri',
    },
  ],

  durgapur: [
    {
      code: 'DGR',
      name: 'Durgapur',
      city: 'Durgapur',
    },
  ],
};
type TrainResult = {
  train: { number: string; name: string; type?: string; runDays?: string[] };
  from: { departure: string; day?: number };
  to: { arrival: string; day?: number };
  duration: number;
  distance?: number;
  totalHaltsBetween?: number;
  live?: { delayMinutes?: number; platform?: string; type?: string };
};

function key() { return process.env.RAILRADAR_API_KEY; }
function cityFromPlace(place: string) {
  const withoutCode = place.replace(/\s*\([A-Z]{3}\)\s*$/, '');
  return withoutCode.includes(',') ? withoutCode.split(',').at(-1)!.trim() : withoutCode.trim();
}
function dateForSearch(crisis: TravelCrisis) {
  return crisis.departureDate ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() + 86_400_000));
}
async function railRadar<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, { headers: { Authorization: `Bearer ${key()}` }, cache: 'no-store' });
  const body = await response.json().catch(() => null) as { success?: boolean; data?: T; error?: { message?: string } } | null;
  if (!response.ok || !body?.success || body.data === undefined) throw new Error(body?.error?.message ?? `RailRadar request failed (${response.status})`);
  return body.data;
}
async function stationsFor(place: string): Promise<Station[]> {
  const city = cityFromPlace(place);
  const hints = CITY_STATION_HINTS[city.toLowerCase()] ?? [];

  let searchedStations: Station[] = [];

  try {
    searchedStations = await railRadar<Station[]>(
      `/lookup/search/stations?q=${encodeURIComponent(city)}&limit=10`
    );
  } catch (error) {
    // If RailRadar lookup fails but we have known major hubs, continue with them.
    if (hints.length === 0) {
      throw error;
    }
  }

  const exactCityStations = searchedStations.filter(
    (station) =>
      station.city?.toLowerCase() === city.toLowerCase()
  );

  const dynamicStations =
    exactCityStations.length > 0
      ? exactCityStations
      : searchedStations;

  // Hints come first for special cities, then dynamically found stations.
  // Duplicate station codes are removed.
  const mergedStations = [...hints, ...dynamicStations];

  const uniqueStations = Array.from(
    new Map(
      mergedStations.map((station) => [station.code, station])
    ).values()
  );

  return uniqueStations.slice(0, 3);
}
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

/** Searches live Indian Railways schedules. It intentionally returns no mock rail data without a key. */
export async function searchRailRadarRoutes(crisis: TravelCrisis): Promise<TravelRoute[]> {
  if (!key()) return [];
  const [origins, destinations] = await Promise.all([stationsFor(crisis.origin), stationsFor(crisis.destination)]);
  if (!origins.length || !destinations.length) return [];
  const pairs = origins
    .flatMap((origin) =>
      destinations
        .filter((destination) => destination.code !== origin.code)
        .map((destination) => ({ origin, destination }))
    )
    .slice(0, 2);
  const pairResults: Array<{
    train: TrainResult;
    origin: Station;
    destination: Station;
  }> = [];

  for (const { origin, destination } of pairs) {
    const data = await railRadar<{ trains: TrainResult[] }>(
      `/trains/between/${encodeURIComponent(
        origin.code
      )}/${encodeURIComponent(destination.code)}?date=${dateForSearch(
        crisis
      )}&byCity=true&live=true`
    );

    pairResults.push(
      ...data.trains.map((train) => ({
        train,
        origin,
        destination,
      }))
    );

    // Stop once a working direct station pair returns trains.
    if (data.trains.length > 0) {
      break;
    }
  }
  // The same train can be returned for more than one station pair. Keep it once.
  const unique = new Map<string, { train: TrainResult; origin: Station; destination: Station }>();
  for (const result of pairResults) if (!unique.has(result.train.train.number)) unique.set(result.train.train.number, result);
  if (unique.size === 0) throw new Error(`RailRadar returned no trains for station pairs: ${pairs.map((pair) => `${pair.origin.code}→${pair.destination.code}`).join(', ')}`);
  return [...unique.values()].map(({ train: item, origin, destination }) => {
    const delay = item.live?.delayMinutes ?? 0;
    const riskLevel = delay >= 60 ? 'HIGH' : delay > 0 ? 'MEDIUM' : 'LOW';
    const score = Math.max(1, 90 - Math.round(item.duration / 40) - delay / 5);
    return {
      id: `railradar-${item.train.number}`, status: 'viable', primaryMode: 'train',
      segments: [{ mode: 'train', from: `${origin.name} (${origin.code})`, to: `${destination.name} (${destination.code})`, departure: item.from.departure, arrival: item.to.arrival, duration: duration(item.duration), carrier: 'Indian Railways' }],
      totalPrice: 0, currency: '₹', finalArrival: item.to.arrival, travelTime: duration(item.duration),
      riskLevel, score, transfers: 0, stops: item.totalHaltsBetween, safetyBuffer: delay ? `${delay} min reported delay` : 'Live schedule',
      deadlineMet: true, withinBudget: false, priceAvailable: false, operatorName: 'Indian Railways',
      serviceName: `${item.train.name} · ${item.train.number}`, category: item.train.type,
      recommendationReasons: [item.train.type ?? 'Indian Railways service', delay ? `${delay} minute live delay` : 'Live schedule available', 'Fare and seat availability must be checked before booking'],
      researchSource: 'RailRadar', sources: [{ name: 'RailRadar', timestamp: new Date().toISOString() }],
    } satisfies TravelRoute;
  });
}
