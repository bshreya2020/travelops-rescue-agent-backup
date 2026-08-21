import { spawn } from 'node:child_process';
import type {
  RiskLevel,
  RouteStatus,
  TravelCrisis,
  TravelRoute,
} from '@/types/travel';

const ABHIBUS_URL = 'https://www.abhibus.com/';

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

type WebcmdResult = {
  id?: string;
  ok?: boolean;
  result?: unknown;
  error?: { message?: string };
};

function runWebcmd(
  args: string[],
  script?: string
): Promise<WebcmdResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('webcmd', args, {
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);

    child.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout) as WebcmdResult;

        if (code !== 0 || parsed.ok === false) {
          reject(
            new Error(
              parsed.error?.message ??
              stderr.trim() ??
              `WebCMD exited with code ${code}`
            )
          );
          return;
        }

        resolve(parsed);
      } catch {
        reject(
          new Error(
            stderr.trim() ||
            stdout.trim() ||
            `WebCMD exited with code ${code}`
          )
        );
      }
    });

    if (script) {
      child.stdin.write(script);
      child.stdin.end();
    }
  });
}

function browserRun(
  sessionId: string,
  script: string
): Promise<WebcmdResult> {
  return runWebcmd(
    [
      '--session',
      sessionId,
      'browser',
      'run',
      '--stdin',
      '--no-snapshot-diff',
      '--timeout',
      '120',
    ],
    script
  );
}

function arrivalDateTime(
  crisis: TravelCrisis,
  arrival?: string,
  duration?: string
) {
  if (!arrival || !crisis.departureDate) return null;

  const match = arrival.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) return null;

  const departureDate = new Date(`${crisis.departureDate}T00:00:00`);

  if (Number.isNaN(departureDate.getTime())) return null;

  const arrivalMinutes = Number(match[1]) * 60 + Number(match[2]);

  const durationMatch = duration?.match(/(\d+)h\s*(\d+)m/i);
  const durationMinutes = durationMatch
    ? Number(durationMatch[1]) * 60 + Number(durationMatch[2])
    : null;

  const calculatedDepartureMinutes =
    durationMinutes === null ? null : arrivalMinutes - durationMinutes;

  const arrivalDate = new Date(departureDate);

  if (
    calculatedDepartureMinutes !== null &&
    calculatedDepartureMinutes < 0
  ) {
    arrivalDate.setDate(arrivalDate.getDate() + 1);
  }

  arrivalDate.setHours(Number(match[1]), Number(match[2]), 0, 0);

  return arrivalDate;
}

function normalizeBus(
  bus: VisibleBus,
  crisis: TravelCrisis,
  index: number
): TravelRoute {
  const arrivalDate = arrivalDateTime(crisis, bus.arrival, bus.duration);
  const deadline = new Date(crisis.deadline);

  const deadlineMet =
    arrivalDate !== null && !Number.isNaN(deadline.getTime())
      ? arrivalDate <= deadline
      : false;

  const priceAvailable = typeof bus.price === 'number';

  const withinBudget =
    priceAvailable && bus.price !== undefined
      ? bus.price <= crisis.maxBudget
      : false;

  const status: RouteStatus =
    !deadlineMet ? 'rejected' : withinBudget ? 'viable' : 'rejected';

  const riskLevel: RiskLevel =
    !deadlineMet ? 'HIGH' : withinBudget ? 'MEDIUM' : 'HIGH';

  const score = Math.max(
    1,
    (deadlineMet ? 60 : 10) +
    (withinBudget ? 25 : 0) -
    (riskLevel === 'HIGH' ? 20 : 0)
  );

  const duration = bus.duration ?? 'Unavailable';
  const operator = bus.operator ?? 'AbhiBus operator';

  return {
    id: `abhibus-${Date.now()}-${index}`,
    status,
    primaryMode: 'bus',
    segments: [
      {
        mode: 'bus',
        from: bus.boardingPoint ?? crisis.origin,
        to: bus.droppingPoint ?? crisis.destination,
        departure: bus.departure ?? 'Unavailable',
        arrival: bus.arrival ?? 'Unavailable',
        duration,
        carrier: operator,
      },
    ],
    totalPrice: bus.price ?? 0,
    currency: '₹',
    finalArrival: bus.arrival ?? 'Unavailable',
    travelTime: duration,
    riskLevel,
    score,
    transfers: 0,
    safetyBuffer:
      arrivalDate && !Number.isNaN(deadline.getTime())
        ? `${Math.round(
          (deadline.getTime() - arrivalDate.getTime()) / 60_000
        )} min`
        : 'Unavailable',
    deadlineMet,
    withinBudget,
    priceAvailable,
    rejectionReason: !deadlineMet
      ? 'Arrival time cannot meet the crisis deadline.'
      : !withinBudget
        ? 'Fare exceeds the crisis budget or was unavailable.'
        : undefined,
    operatorName: operator,
    serviceName: bus.service,
    vehicleType: bus.busType,
    amenities: bus.amenities ?? [],
    boardingPoints: bus.boardingPoint ? [bus.boardingPoint] : [],
    droppingPoints: bus.droppingPoint ? [bus.droppingPoint] : [],
    sources: [
      {
        name: 'AbhiBus',
        timestamp: new Date().toISOString(),
      },
    ],
    researchSource: 'AbhiBus via WebCMD',
  };
}

export async function searchBusRoutes(
  crisis: TravelCrisis
): Promise<TravelRoute[]> {
  if (!crisis.departureDate) return [];

  let sessionId: string | undefined;

  try {
    const session = await runWebcmd([
      '--profile',
      'default',
      'session',
      'create',
      '-f',
      'json',
    ]);

    sessionId = session.id;

    if (!sessionId) {
      throw new Error('WebCMD did not return a browser session id.');
    }

    const day = Number(crisis.departureDate.slice(8, 10));
    const month = Number(crisis.departureDate.slice(5, 7));
    const year = Number(crisis.departureDate.slice(0, 4));

    const script = `
      const clean = (value) =>
        (value || '').replace(/\\s+/g, ' ').trim();

      const visibleFirst = (selector) =>
        page.locator(selector).filter({ visible: true }).first();

      const normalizeTime = (value) => {
        const match = clean(value).match(
          /^(\\d{1,2}):(\\d{2})(?:\\s*([AP]M))?$/i
        );

        if (!match) return clean(value) || undefined;

        let hour = Number(match[1]);
        const minute = match[2];
        const suffix = match[3]?.toUpperCase();

        if (suffix === 'PM' && hour !== 12) hour += 12;
        if (suffix === 'AM' && hour === 12) hour = 0;

        return String(hour).padStart(2, '0') + ':' + minute;
      };

      await page.setViewportSize({
        width: 1440,
        height: 1100,
      });

      await page.goto(${JSON.stringify(ABHIBUS_URL)}, {
        waitUntil: 'domcontentloaded',
      });

      await page.waitForTimeout(2500);

      const consentButton = page
        .locator('button')
        .filter({
          hasText: /accept|allow all|got it|continue/i,
        })
        .filter({ visible: true })
        .first();

      if (await consentButton.count()) {
        await consentButton.click({ timeout: 3000 }).catch(() => {});
      }

      const fromInput = visibleFirst(
        'input[placeholder="Leaving From"]'
      );

      if (!(await fromInput.count())) {
        throw new Error(
          'AbhiBus did not show the Leaving From field. It may have displayed a verification or blocked page.'
        );
      }

      await fromInput.fill(${JSON.stringify(crisis.origin.slice(0, 3))});
      await page.waitForTimeout(2200);

      const originChoice = page
        .getByText(
          ${JSON.stringify(
      `${crisis.origin} (All boarding points)`
    )},
          { exact: true }
        )
        .filter({ visible: true })
        .first();

      if (!(await originChoice.count())) {
        throw new Error(
          'AbhiBus did not offer the chosen origin as a boarding city.'
        );
      }

      await originChoice.click({ timeout: 15000 });

      const destinationInput = visibleFirst(
        'input[placeholder="Going To"]'
      );

      if (!(await destinationInput.count())) {
        throw new Error('AbhiBus did not show the Going To field.');
      }

      await destinationInput.fill(
        ${JSON.stringify(crisis.destination.slice(0, 3))}
      );

      await page.waitForTimeout(2200);

      const destinationChoice = page
        .locator('div.text-neutral-800.col')
        .filter({
          hasText: ${JSON.stringify(crisis.destination)},
        })
        .filter({ visible: true })
        .first();

      if (!(await destinationChoice.count())) {
        throw new Error(
          'AbhiBus did not offer the chosen destination city.'
        );
      }

      await destinationChoice.click({ timeout: 15000 });

      const dateInput = visibleFirst(
        'input[placeholder="Onward Journey Date"]'
      );

      if (!(await dateInput.count())) {
        throw new Error('AbhiBus did not show the journey date field.');
      }

      await dateInput.click({ timeout: 15000 });

      const dateChoice = visibleFirst(
        'a[data-date="${day}"][data-month="${month}"][data-year="${year}"]'
      );

      if (!(await dateChoice.count())) {
        throw new Error(
          'The selected date is not available in the AbhiBus calendar.'
        );
      }

      await dateChoice.click({ timeout: 15000 });

      const searchButton = visibleFirst('a.btn-search');

      if (!(await searchButton.count())) {
        throw new Error('AbhiBus did not show its Search Buses button.');
      }

      await searchButton.click({ timeout: 15000 });
      await page.waitForTimeout(6500);

      const buses = await page.locator('body').evaluate(() => {
        const clean = (value) =>
          (value || '').replace(/\\s+/g, ' ').trim();

        const isVisible = (element) => {
          const rect = element.getBoundingClientRect();

          return rect.width > 0 && rect.height > 0;
        };

        const cardSelectors = [
          'div.row.card-body.service-info',
          '[class*="service-info"]',
          '[class*="bus-card"]',
        ];

        let cards = [];

        for (const selector of cardSelectors) {
          const found = Array.from(document.querySelectorAll(selector)).filter(
            isVisible
          );

          if (found.length > 0) {
            cards = found;
            break;
          }
        }

        if (cards.length === 0) {
          const seatButtons = Array.from(
            document.querySelectorAll('button, a')
          ).filter((element) =>
            /^(Select|View) Seats$/i.test(clean(element.textContent))
          );

          cards = seatButtons
            .map((button) => {
              let parent = button.parentElement;

              for (
                let level = 0;
                parent && level < 8;
                level += 1, parent = parent.parentElement
              ) {
                const parentText = clean(parent.innerText);
                const seatButtonCount = (
                  parentText.match(/(?:Select|View) Seats/gi) || []
                ).length;

                if (
                  parentText.length > 80 &&
                  parentText.length < 2200 &&
                  seatButtonCount === 1
                ) {
                  return parent;
                }
              }

              return button.parentElement;
            })
            .filter(Boolean);
        }

        const getText = (card, selectors) => {
          for (const selector of selectors) {
            const value = clean(card.querySelector(selector)?.textContent);

            if (value) return value;
          }

          return undefined;
        };

        return cards.slice(0, 30).map((card) => {
          const cardText = clean(card.innerText);
          const lines = cardText
            .split('\\n')
            .map(clean)
            .filter(Boolean);

          const busTypeIndex = lines.findIndex((line) =>
            /\\b(?:AC|Non[- ]?AC|Volvo|Sleeper|Seater|Benz|Eicher|Scania)\\b/i.test(
              line
            )
          );

          const ignoredOperatorText =
            /^(?:save|from|select seats|view seats|seats left|offers?|live tracking|book now)$/i;

          const fallbackOperator = lines
            .slice(0, busTypeIndex >= 0 ? busTypeIndex : lines.length)
            .reverse()
            .find(
              (line) =>
                line.length > 2 &&
                !ignoredOperatorText.test(line) &&
                !/^₹?[0-9,]+(?:\\+)?$/.test(line) &&
                !/^\\d{1,2}:\\d{2}(?:\\s?[AP]M)?$/i.test(line)
            );

          const timeValues = lines.filter((line) =>
            /^\\d{1,2}:\\d{2}(?:\\s?[AP]M)?$/i.test(line)
          );

          const priceValues = [
            ...cardText.matchAll(/₹\\s*([0-9][0-9,]*)/g),
          ]
            .map((match) => Number(match[1].replace(/,/g, '')))
            .filter((value) => value >= 50);

          const seatsMatch = cardText.match(
            /([0-9]+)\\s+Seats?\\s+Left/i
          );

          return {
            operator:
              getText(card, [
                '.operator-info .title',
                '[class*="operator"] [class*="title"]',
                '[class*="operator-name"]',
              ]) || fallbackOperator,

            service: getText(card, [
              '.operator-info .sub-title',
              '[class*="service-name"]',
            ]),

            busType:
              getText(card, [
                '.bus-type-chip__text',
                '[class*="bus-type"]',
                '[class*="vehicle-type"]',
              ]) ||
              (busTypeIndex >= 0
                ? lines[busTypeIndex]
                : undefined),

            departure:
              getText(card, [
                '.departure-time',
                '[class*="departure"] [class*="time"]',
              ]) || timeValues[0],

            arrival:
              getText(card, [
                '.arrival-time',
                '[class*="arrival"] [class*="time"]',
              ]) || timeValues[1],

            duration:
              getText(card, [
                '.travel-time',
                '[class*="duration"]',
                '[class*="travel-time"]',
              ]) ||
              lines.find((line) =>
                /^\\d+\\s*h(?:ours?)?\\s*\\d*\\s*m?(?:ins?)?$/i.test(
                  line
                )
              ),

            price: priceValues.at(-1),

            seats: seatsMatch ? Number(seatsMatch[1]) : undefined,

            boardingPoint: getText(card, [
              '.source-name',
              '[class*="boarding"]',
              '[class*="source"]',
            ]),

            droppingPoint: getText(card, [
              '.destination-name',
              '[class*="dropping"]',
              '[class*="destination"]',
            ]),

            amenities: lines.filter((line) =>
              /^(Toilet|Helpful Staff|Clean & Hygienic|Most Trusted|Wi-?Fi|Water Bottle|Blanket)$/i.test(
                line
              )
            ),
          };
        }).filter(
          (bus) =>
            Boolean(bus.operator) ||
            Boolean(bus.busType) ||
            Boolean(bus.departure)
        );
      });

      if (!buses.length) {
        throw new Error(
          'AbhiBus loaded, but no visible bus cards were found for this search.'
        );
      }

      return { url: page.url(), buses };
    `;

    const result = await browserRun(sessionId, script);

    const visible = result.result as { buses?: VisibleBus[] } | undefined;

    if (!visible?.buses?.length) {
      throw new Error('AbhiBus returned no readable bus cards.');
    }

    return visible.buses.map((bus, index) =>
      normalizeBus(bus, crisis, index)
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown AbhiBus/WebCMD error';

    console.error('[TravelOps] AbhiBus WebCMD search failed:', message);

    throw new Error(message);
  } finally {
    if (sessionId) {
      try {
        await runWebcmd(['session', 'close', sessionId]);
      } catch (error) {
        console.warn(
          '[TravelOps] AbhiBus WebCMD session close failed:',
          (error as Error).message
        );
      }
    }
  }
}