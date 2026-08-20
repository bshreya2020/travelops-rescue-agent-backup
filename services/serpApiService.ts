import type { TravelCrisis, TravelRoute } from '@/types/travel';

const AIRPORTS_CSV = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
type Airport = { name: string; municipality: string; iataCode: string; latitude: number; longitude: number };
export interface SerpPlace { id: string; name: string; type: 'airport' | 'city'; iataCode: string; cityName: string | null; countryCode: string; airports: Array<{ name: string; iataCode: string }> }
let airportCache: Airport[] | null = null;

function parseCsvLine(line: string) {
  const values: string[] = []; let value = ''; let quoted = false;
  for (let i = 0; i < line.length; i += 1) { const c = line[i]; if (c === '"') { if (quoted && line[i + 1] === '"') { value += c; i += 1; } else quoted = !quoted; } else if (c === ',' && !quoted) { values.push(value); value = ''; } else value += c; }
  values.push(value); return values;
}
async function indianAirports(): Promise<Airport[]> {
  if (airportCache) return airportCache;
  // The source CSV is ~16 MB, above Next.js' persistent data-cache limit.
  // Keep it only in this server process via airportCache instead.
  const response = await fetch(AIRPORTS_CSV, { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load the Indian airport directory. Please try again.');
  const lines = (await response.text()).split(/\r?\n/); const headers = parseCsvLine(lines[0]);
  const index = (key: string) => headers.indexOf(key);
  airportCache = lines.slice(1).flatMap((line) => {
    const row = parseCsvLine(line); const iata = row[index('iata_code')]; const country = row[index('iso_country')];
    if (country !== 'IN' || !/^[A-Z]{3}$/.test(iata ?? '')) return [];
    const latitude = Number(row[index('latitude_deg')]); const longitude = Number(row[index('longitude_deg')]);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? [{ name: row[index('name')], municipality: row[index('municipality')] || row[index('name')], iataCode: iata, latitude, longitude }] : [];
  });
  return airportCache;
}
const distanceKm = (a: Airport, latitude: number, longitude: number) => { const r = Math.PI / 180; const x = Math.sin((latitude - a.latitude) * r / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(latitude * r) * Math.sin((longitude - a.longitude) * r / 2) ** 2; return 12742 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); };

/** Airport/city suggestions for all Indian airports. Town names with no airport resolve to nearby airports. */
export async function suggestIndianPlaces(query: string): Promise<SerpPlace[]> {
  if (query.trim().length < 2) return [];
  const airports = await indianAirports(); const needle = query.trim().toLowerCase();
  let matches = airports.filter((airport) => `${airport.name} ${airport.municipality} ${airport.iataCode}`.toLowerCase().includes(needle)).slice(0, 8);
  if (matches.length === 0) {
    const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'TravelOps-demo/1.0' }, next: { revalidate: 3_600 } }).then((r) => r.ok ? r.json() : [] as unknown);
    const place = Array.isArray(geo) ? geo[0] as { lat?: string; lon?: string } | undefined : undefined;
    if (place?.lat && place?.lon) matches = [...airports].sort((a, b) => distanceKm(a, Number(place.lat), Number(place.lon)) - distanceKm(b, Number(place.lat), Number(place.lon))).slice(0, 5);
  }
  // City suggestions are first-class UI values. We retain one airport code only
  // for the flight provider; RailRadar receives the city name separately.
  const cities = new Map<string, Airport[]>();
  for (const airport of matches) {
    const cityKey = airport.municipality.toLowerCase();
    cities.set(cityKey, [...(cities.get(cityKey) ?? []), airport]);
  }
  return [...cities.values()].map((cityAirports) => {
    const primary = cityAirports[0];
    return { id: `city-${primary.municipality.toLowerCase()}`, name: primary.municipality, type: 'city', iataCode: primary.iataCode, cityName: primary.municipality, countryCode: 'IN', airports: cityAirports.map((airport) => ({ name: airport.name, iataCode: airport.iataCode })) };
  });
}

const duration = (total: number) => `${Math.floor(total / 60)}h ${total % 60}m`;
const displayTime = (value: string) => { const [, hour = '0', minute = '00'] = value.match(/\s(\d{2}):(\d{2})/) ?? []; const h = Number(hour); return `${((h + 11) % 12) + 1}:${minute} ${h >= 12 ? 'PM' : 'AM'}`; };
function apiKey() { const key = process.env.SERPAPI_KEY; if (!key) throw new Error('SERPAPI_KEY is not configured. Add it to frontend/.env.local.'); return key; }

type SerpFlight = { airline?: string; flight_number?: string; duration?: number; departure_airport: { name: string; id: string; time: string }; arrival_airport: { name: string; id: string; time: string } };
type SerpOffer = { flights: SerpFlight[]; layovers?: Array<{ duration: number; name: string; id: string }>; total_duration: number; price?: number; airline_logo?: string };

/** Google Flights search through SerpApi. stops=0 intentionally includes direct and connecting results. */
export async function searchSerpApiFlights(crisis: TravelCrisis, origin: string, destination: string): Promise<TravelRoute[]> {
  // Default to tomorrow: a same-day rescue search late in the day often has no
  // remaining departures, whereas users can explicitly choose today in the UI.
  const departureDate = crisis.departureDate ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() + 86_400_000));
  const params = new URLSearchParams({ engine: 'google_flights', departure_id: origin, arrival_id: destination, outbound_date: departureDate, type: '2', adults: String(Math.max(1, crisis.passengers.adults)), currency: 'INR', gl: 'in', hl: 'en', stops: '0', deep_search: 'true', api_key: apiKey() });
  if (crisis.passengers.children > 0) params.set('children', String(crisis.passengers.children));
  if (crisis.passengers.infants > 0) params.set('infants_on_lap', String(crisis.passengers.infants));
  const response = await fetch(`https://serpapi.com/search.json?${params}`, { cache: 'no-store' });
  const body = await response.json().catch(() => null) as { best_flights?: SerpOffer[]; other_flights?: SerpOffer[]; error?: string } | null;
  if (!response.ok || body?.error) throw new Error(body?.error ?? `SerpApi request failed (${response.status})`);
  const offers = [...(body?.best_flights ?? []), ...(body?.other_flights ?? [])];
  return offers.flatMap((offer, index) => {
    if (!offer.price || !offer.flights?.length) return [];
    const segments = offer.flights.map((flight) => ({ mode: 'flight' as const, from: `${flight.departure_airport.name} (${flight.departure_airport.id})`, to: `${flight.arrival_airport.name} (${flight.arrival_airport.id})`, departure: displayTime(flight.departure_airport.time), arrival: displayTime(flight.arrival_airport.time), duration: duration(flight.duration ?? 0), carrier: [flight.airline, flight.flight_number].filter(Boolean).join(' ') || 'Airline' }));
    const transfers = Math.max(0, segments.length - 1); const withinBudget = offer.price <= crisis.maxBudget; const score = crisis.priority === 'cheapest' ? Math.max(1, 100 - Math.round(offer.price / 150)) : Math.max(1, 100 - Math.round(offer.total_duration / 10) - Math.round(offer.price / 300));
    return [{ id: `serpapi-${index}`, status: withinBudget ? (transfers === 0 ? 'recommended' : 'viable') : 'rejected', primaryMode: 'flight', segments, totalPrice: offer.price, currency: '₹', finalArrival: segments.at(-1)?.arrival ?? '', travelTime: duration(offer.total_duration), riskLevel: transfers ? 'MEDIUM' : 'LOW', score, transfers, stops: transfers, safetyBuffer: transfers ? (offer.layovers ?? []).map((layover) => `${layover.id} ${duration(layover.duration)}`).join(' · ') : 'Nonstop', deadlineMet: true, withinBudget, operatorName: segments[0]?.carrier, serviceName: segments.map((segment) => segment.carrier).join(' · '), recommendationReasons: transfers ? ['Connecting itinerary from Google Flights'] : ['Nonstop flight from Google Flights'], rejectionReason: withinBudget ? undefined : `Exceeds your ₹${crisis.maxBudget.toLocaleString()} budget`, researchSource: 'Google Flights via SerpApi', sources: [{ name: 'SerpApi / Google Flights', timestamp: new Date().toISOString() }] } satisfies TravelRoute];
  }).sort((a, b) => b.score - a.score);
}
