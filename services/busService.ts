import { spawn } from 'node:child_process';
import type { TravelCrisis, TravelRoute, RiskLevel, RouteStatus } from '@/types/travel';

const ABBIBUS_URL = 'https://www.abhibus.com/';

type VisibleBus = {
  operator?: string;
  service?: string;
  busType?: string;
  departure?: string;
  arrival?: string;
  duration?: string;
  price?: number;
  seats?: number;
  boardingPoint?: string;
  droppingPoint?: string;
  amenities?: string[];
};

type WebcmdResult = { id?: string; ok?: boolean; result?: unknown; error?: { message?: string } };

function runWebcmd(args: string[], script?: string): Promise<WebcmdResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('webcmd', args, { shell: process.platform === 'win32' });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout) as WebcmdResult;
        if (code !== 0 || parsed.ok === false) reject(new Error(parsed.error?.message ?? stderr.trim() ?? `Webcmd exited with code ${code}`));
        else resolve(parsed);
      } catch {
        reject(new Error(stderr.trim() || stdout.trim() || `Webcmd exited with code ${code}`));
      }
    });
    if (script) {
      child.stdin.write(script);
      child.stdin.end();
    }
  });
}

function browserRun(sessionId: string, script: string): Promise<WebcmdResult> {
  return runWebcmd(['--session', sessionId, 'browser', 'run', '--stdin', '--no-snapshot-diff', '--timeout', '60'], script);
}

function parsePrice(value?: string) {
  const match = value?.replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : null;
}

function parseDuration(value?: string) {
  const match = value?.match(/(?:(\d+)h)?[.\s]*(?:(\d+)m)?/i);
  if (!match || (!match[1] && !match[2])) return null;
  return `${Number(match[1] ?? 0)}h ${Number(match[2] ?? 0)}m`;
}

function parseVisibleResults(text: string): VisibleBus[] {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const results: VisibleBus[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] !== 'Select Seats') continue;
    const seats = lines[index + 1]?.match(/^([0-9]+) Seats Left$/)?.[1];
    const priceIndex = lines.slice(Math.max(0, index - 8), index).findLastIndex((line) => /^₹?[0-9,]+$/.test(line));
    const start = Math.max(0, index - 18);
    const card = lines.slice(start, index + 2);
    const times = card.filter((line) => /^\d{1,2}:\d{2}$/.test(line));
    const duration = card.find((line) => /^(?:\d+h(?:\.?\d+m)?)$/.test(line));
    const operatorIndex = card.findIndex((line) => line === 'Kolkata' || line === 'Siliguri');
    const destinationIndex = card.findIndex((line, cardIndex) => cardIndex > operatorIndex && line === 'Siliguri');
    const cityIndex = card.findIndex((line) => line === 'Kolkata');
    const operator = card.find((line, cardIndex) => cardIndex < cityIndex && !/^(?:Save|₹|From|Select Seats|[0-9:.]+|[0-9]+ Seats Left)$/.test(line) && line.length > 2);
    const busType = card.find((line) => /\b(?:AC|NON AC|VOLVO|Sleeper|Seater|Benz|Eicher)\b/i.test(line) && line !== operator);
    const boardingPoint = cityIndex >= 0 ? card[cityIndex] : undefined;
    const droppingPoint = destinationIndex >= 0 ? card[destinationIndex] : undefined;
    const visiblePrice = priceIndex >= 0 ? lines[Math.max(0, index - 8) + priceIndex] : undefined;
    results.push({
      operator,
      busType,
      departure: times[0],
      arrival: times[1],
      duration: parseDuration(duration ?? undefined) ?? undefined,
      price: parsePrice(visiblePrice ?? undefined) ?? undefined,
      seats: seats ? Number(seats) : undefined,
      boardingPoint,
      droppingPoint,
      amenities: card.filter((line) => /^(Toilet|Helpful Staff|Clean & Hygienic|Most Trusted)$/.test(line)),
    });
  }
  return results;
}

function arrivalDateTime(crisis: TravelCrisis, arrival?: string, duration?: string) {
  if (!arrival || !crisis.departureDate) return null;
  const match = arrival.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const departure = new Date(`${crisis.departureDate}T00:00:00`);
  if (Number.isNaN(departure.getTime())) return null;
  const arrivalMinutes = Number(match[1]) * 60 + Number(match[2]);
  const durationMatch = duration?.match(/(\d+)h\s*(\d+)m/);
  const durationMinutes = durationMatch ? Number(durationMatch[1]) * 60 + Number(durationMatch[2]) : null;
  const departureMinutes = durationMinutes === null ? null : arrivalMinutes - durationMinutes;
  const crossesMidnight = departureMinutes !== null && departureMinutes < 0;
  const date = new Date(departure);
  if (crossesMidnight) date.setDate(date.getDate() + 1);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

function normalizeBus(bus: VisibleBus, crisis: TravelCrisis, index: number): TravelRoute {
  const arrivalDate = arrivalDateTime(crisis, bus.arrival, bus.duration);
  const deadline = new Date(crisis.deadline);
  const deadlineMet = arrivalDate !== null && !Number.isNaN(deadline.getTime()) ? arrivalDate <= deadline : false;
  const priceAvailable = typeof bus.price === 'number';
  const withinBudget = priceAvailable && bus.price !== undefined ? bus.price <= crisis.maxBudget : false;
  const status: RouteStatus = !deadlineMet ? 'rejected' : withinBudget ? 'viable' : 'rejected';
  const riskLevel: RiskLevel = !deadlineMet ? 'HIGH' : withinBudget ? 'MEDIUM' : 'HIGH';
  const score = Math.max(1, (deadlineMet ? 60 : 10) + (withinBudget ? 25 : 0) - (riskLevel === 'HIGH' ? 20 : 0));
  const duration = bus.duration ?? 'Unavailable';
  return {
    id: `abhibus-${index}`,
    status,
    primaryMode: 'bus',
    segments: [{ mode: 'bus', from: bus.boardingPoint ?? crisis.origin, to: bus.droppingPoint ?? crisis.destination, departure: bus.departure ?? 'Unavailable', arrival: bus.arrival ?? 'Unavailable', duration, carrier: bus.operator }],
    totalPrice: bus.price ?? 0,
    currency: 'INR',
    finalArrival: bus.arrival ?? 'Unavailable',
    travelTime: duration,
    riskLevel,
    score,
    transfers: 0,
    safetyBuffer: arrivalDate && !Number.isNaN(deadline.getTime()) ? `${Math.round((deadline.getTime() - arrivalDate.getTime()) / 60_000)} min` : 'Unavailable',
    deadlineMet,
    withinBudget,
    priceAvailable,
    rejectionReason: !deadlineMet ? 'Arrival time cannot meet the crisis deadline.' : !withinBudget ? 'Fare exceeds the crisis budget or was unavailable.' : undefined,
    operatorName: bus.operator,
    serviceName: bus.service,
    vehicleType: bus.busType,
    amenities: bus.amenities ?? [],
    boardingPoints: bus.boardingPoint ? [bus.boardingPoint] : [],
    droppingPoints: bus.droppingPoint ? [bus.droppingPoint] : [],
    sources: [{ name: 'AbhiBus', timestamp: new Date().toISOString() }],
    researchSource: 'AbhiBus via Webcmd',
  };
}

export async function searchBusRoutes(crisis: TravelCrisis): Promise<TravelRoute[]> {
  if (!crisis.departureDate) return [];
  let sessionId: string | undefined;
  try {
    const session = await runWebcmd(['--profile', 'default', 'session', 'create', '-f', 'json']);
    sessionId = session.id;
    if (!sessionId) throw new Error('Webcmd did not return a browser session id.');
    const day = Number(crisis.departureDate.slice(8, 10));
    const month = Number(crisis.departureDate.slice(5, 7));
    const year = Number(crisis.departureDate.slice(0, 4));
    const script = `
      await page.goto(${JSON.stringify(ABBIBUS_URL)});
      await page.locator('input[placeholder="Leaving From"]').fill(${JSON.stringify(crisis.origin.slice(0, 3))});
      await page.waitForTimeout(3500);
      await page.getByText(${JSON.stringify(`${crisis.origin} (All boarding points)`)}, { exact: true }).click({ timeout: 10000 });
      await page.locator('input[placeholder="Going To"]').fill(${JSON.stringify(crisis.destination.slice(0, 3))});
      await page.waitForTimeout(3500);
      await page.locator('div.text-neutral-800.col').filter({ hasText: ${JSON.stringify(crisis.destination)} }).first().click({ timeout: 10000 });
      await page.locator('input[placeholder="Onward Journey Date"]').click();
      await page.locator('a[data-date="${day}"][data-month="${month}"][data-year="${year}"]').click();
      await page.locator('a.btn-search').click({ timeout: 10000, noWaitAfter: true });
      await page.waitForTimeout(8000);
      return { url: page.url(), text: await page.locator('body').innerText() };
    `;
    const result = await browserRun(sessionId, script);
    const visible = result.result as { text?: string } | undefined;
    if (!visible?.text) return [];
    return parseVisibleResults(visible.text).map((bus, index) => normalizeBus(bus, crisis, index));
  } catch (error) {
    console.warn('[TravelOps] AbhiBus Webcmd search skipped:', (error as Error).message);
    return [];
  } finally {
    if (sessionId) {
      try { await runWebcmd(['session', 'close', sessionId]); }
      catch (error) { console.warn('[TravelOps] AbhiBus Webcmd session close failed:', (error as Error).message); }
    }
  }
}