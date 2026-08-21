'use client';

import { useState } from 'react';
import { ArrowRight, Bus, ChevronDown, ExternalLink, MapPin, Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { BookingSource, TravelRoute } from '@/types/travel';

function isBookingUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Pick the best booking source: valid URL first, then lowest price. */
function bestSource(sources: BookingSource[]): BookingSource | null {
  const withUrl = sources.filter((s) => isBookingUrl(s.bookingUrl));
  if (withUrl.length === 0) return null;
  return withUrl.reduce((best, s) => {
    if (typeof s.price !== 'number') return best;
    if (typeof best.price !== 'number') return s;
    return s.price < best.price ? s : best;
  }, withUrl[0]);
}

/** Fallback booking URLs by mode when no source URL is available. */
const MODE_FALLBACK: Record<string, string> = {
  train: 'https://www.irctc.co.in',
  flight: 'https://www.makemytrip.com/flights/',
  bus: 'https://www.redbus.in',
};

function SourceRow({ source, currency }: { source: BookingSource; currency: string }) {
  const bookingAvailable = isBookingUrl(source.bookingUrl);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-700/60 px-3 py-3 first:border-t-0">
      <p className="min-w-28 text-sm font-semibold text-white">{source.name}</p>
      {typeof source.rating === 'number' && (
        <span className="inline-flex items-center gap-1 text-xs text-yellow-300"><Star size={12} fill="currentColor" /> {source.rating.toFixed(1)}</span>
      )}
      {typeof source.price === 'number' && <span className="text-sm text-cyan-300">{currency}{source.price.toLocaleString()}</span>}
      <span className="ml-auto">
        {bookingAvailable ? (
          <a href={source.bookingUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20">
            Book Now <ExternalLink size={12} />
          </a>
        ) : <span className="text-xs text-slate-500">Booking link unavailable</span>}
      </span>
    </div>
  );
}

export function TravelResultCard({ route, maxBudget, researchPowered, onSelect }: { route: TravelRoute; maxBudget: number; researchPowered: boolean; onSelect?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmBooking, setConfirmBooking] = useState(false);

  const firstSegment = route.segments[0];
  const lastSegment = route.segments[route.segments.length - 1] ?? firstSegment;
  const operatorName = route.operatorName ?? firstSegment?.carrier;
  const sources = route.sources ?? [];
  const sourceNames = sources.map((s) => s.name);
  const priceAvailable = route.priceAvailable ?? true;
  const withinBudget = priceAvailable && (route.withinBudget ?? route.totalPrice <= maxBudget);
  const statusVariant = route.status === 'rejected' ? 'rejected' : route.status === 'recommended' ? 'info' : 'success';
  const riskVariant = route.riskLevel === 'LOW' ? 'success' : route.riskLevel === 'MEDIUM' ? 'warning' : 'crisis';
  const detailsAvailable = Boolean(route.serviceName || route.vehicleType || route.category || route.amenities?.length || route.boardingPoints?.length || route.droppingPoints?.length || route.segments.length > 1 || sources.some((s) => s.timestamp || s.bookingUrl));

  const primary = bestSource(sources);
  const bookingUrl = primary?.bookingUrl ?? null;
  const bookingSourceName = primary?.name ?? null;
  const fallbackUrl = MODE_FALLBACK[route.primaryMode] ?? null;

  const handleSelectRoute = () => {
    // Save to trip history
    onSelect?.();
    // Show confirmation before opening booking tab
    setConfirmBooking(true);
  };

  const handleConfirmBooking = () => {
    setConfirmBooking(false);
    const url = bookingUrl ?? fallbackUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className={`border ${route.status === 'rejected' ? 'border-red-500/30 bg-red-950/10' : 'border-slate-700/80 bg-slate-900/50'}`} padding="none">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700/70 px-5 py-3">
        <Badge variant={statusVariant} dot>{route.status === 'rejected' ? 'Rejected' : 'Viable'}</Badge>
        {route.status === 'recommended' && <Badge variant="info">Top pick</Badge>}
        <Badge variant={riskVariant}>{route.riskLevel} risk</Badge>
        {researchPowered && <span className="ml-auto text-xs text-slate-500">Research powered by TravelOps Browser Agent</span>}
      </div>

      <div className="grid divide-y divide-slate-700/60 xl:grid-cols-[1.2fr_1.4fr_.7fr_1fr] xl:divide-x xl:divide-y-0">
        <section className="p-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400"><Bus size={13} /> {route.primaryMode}</p>
          <h3 className="text-lg font-bold text-white">{operatorName ?? 'Operator details unavailable'}</h3>
          {route.serviceName && <p className="mt-1 text-sm font-medium text-slate-200">{route.serviceName}</p>}
          {route.vehicleType && <p className="mt-1 text-sm text-slate-400">{route.vehicleType}</p>}
          {route.category && <p className="mt-1 text-xs text-slate-500">{route.category}</p>}
          {route.amenities && route.amenities.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {route.amenities.map((amenity) => <span key={amenity} className="rounded-full border border-slate-600/70 bg-slate-800 px-2 py-1 text-xs text-slate-300">{amenity}</span>)}
            </div>
          )}
        </section>

        <section className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Route & timing</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div><p className="text-sm font-semibold text-white">{firstSegment?.from}</p><p className="mt-1 text-cyan-300">{firstSegment?.departure}</p></div>
            <div className="min-w-24 text-center"><p className="mb-1 text-xs text-slate-400">{route.travelTime}</p><ArrowRight className="mx-auto text-cyan-500" size={24} /><p className="mt-1 text-xs text-slate-500">{route.transfers === 0 ? 'Direct' : `${route.transfers} transfer${route.transfers === 1 ? '' : 's'}`}</p></div>
            <div className="text-right"><p className="text-sm font-semibold text-white">{lastSegment?.to}</p><p className="mt-1 text-cyan-300">{lastSegment?.arrival}</p></div>
          </div>
          <div className="mt-4 space-y-1 text-xs text-slate-400">
            {route.stops !== undefined && <p>Stops: {route.stops}</p>}
            <p>Transfers: {route.transfers}</p>
            {route.deadlineMet ? <p className="font-medium text-green-400">✓ Meets deadline {route.safetyBuffer && `· ${route.safetyBuffer} buffer`}</p> : <p className="font-medium text-red-400">✕ {route.rejectionReason ?? 'Misses deadline'}</p>}
          </div>
        </section>

        <section className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Price & score</p>
          {priceAvailable ? <><p className="mt-3 text-2xl font-bold text-cyan-300">{route.currency}{route.totalPrice.toLocaleString()}</p><p className="text-xs text-slate-500">per seat</p></> : <p className="mt-3 text-sm font-medium text-slate-400">Fare unavailable</p>}
          <p className="mt-4 text-sm text-slate-300">Score: <span className="font-bold text-white">{route.score}/100</span></p>
          <p className={`mt-2 text-xs font-medium ${priceAvailable ? (withinBudget ? 'text-green-400' : 'text-red-400') : 'text-yellow-400'}`}>{!priceAvailable ? 'Fare not returned by source' : withinBudget ? '✓ Within budget' : `✕ Exceeds ${route.currency}${maxBudget.toLocaleString()} budget`}</p>
          {route.rejectionReason && <p className="mt-3 text-xs leading-5 text-red-300">{route.rejectionReason}</p>}
        </section>

        <section className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available on</p>
          {sources.length > 0
            ? <div className="mt-3 overflow-hidden rounded-lg border border-slate-700/70 bg-slate-950/30">{sources.map((source, i) => <SourceRow key={`${source.name}-${i}`} source={source} currency={route.currency} />)}</div>
            : <p className="mt-3 text-sm text-slate-500">No booking provider data was returned for this option.</p>}
          {(sourceNames.length > 0 || route.researchSource) && <p className="mt-3 text-xs text-slate-500">Data sourced from: {sourceNames.length > 0 ? sourceNames.join(' • ') : route.researchSource}</p>}
        </section>
      </div>

      {/* Booking confirmation inline panel */}
      {confirmBooking && (
        <div className="border-t border-slate-700/70 bg-slate-800/60 px-5 py-4">
          <p className="text-sm font-semibold text-white mb-1">
            {bookingUrl
              ? <>Continue to <span className="text-cyan-300">{bookingSourceName}</span>?</>
              : fallbackUrl
                ? <>No direct booking link. Open <span className="text-cyan-300">{route.primaryMode === 'train' ? 'IRCTC' : route.primaryMode === 'flight' ? 'MakeMyTrip' : 'redBus'}</span> to search manually?</>
                : 'No booking link available for this route.'}
          </p>
          {(bookingUrl ?? fallbackUrl) ? (
            <p className="text-xs text-slate-400 mb-3">
              {bookingUrl ? 'This will open the booking site in a new tab. TravelOps stays open.' : 'TravelOps found this route, but the booking source did not provide a direct link.'}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mb-3">TravelOps found this route, but the booking source did not provide a booking link.</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmBooking(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-600 text-xs text-slate-300 hover:bg-slate-700">
              Cancel
            </button>
            {(bookingUrl ?? fallbackUrl) && (
              <button type="button" onClick={handleConfirmBooking}
                className="px-3 py-1.5 rounded-lg bg-blue-600 border border-blue-500/50 text-xs font-semibold text-white hover:bg-blue-500 inline-flex items-center gap-1.5">
                Continue <ExternalLink size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-700/70 px-5 py-3">
        <button type="button" onClick={() => setExpanded((v) => !v)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:text-cyan-200">
          View Full Details <ChevronDown size={16} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {route.status !== 'rejected' && onSelect && (
          <button type="button" onClick={handleSelectRoute}
            className="ml-auto rounded-lg border border-blue-500/50 bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500">
            Select This Route
          </button>
        )}
        {expanded && (
          <div className="mt-1 grid w-full gap-4 border-t border-slate-700/60 pt-4 text-sm md:grid-cols-2">
            {route.boardingPoints && route.boardingPoints.length > 0 && <div><p className="mb-1 font-semibold text-slate-300">Boarding points</p>{route.boardingPoints.map((point) => <p key={point} className="flex gap-1.5 text-slate-400"><MapPin size={13} className="mt-0.5 text-cyan-500" />{point}</p>)}</div>}
            {route.droppingPoints && route.droppingPoints.length > 0 && <div><p className="mb-1 font-semibold text-slate-300">Dropping points</p>{route.droppingPoints.map((point) => <p key={point} className="flex gap-1.5 text-slate-400"><MapPin size={13} className="mt-0.5 text-cyan-500" />{point}</p>)}</div>}
            {route.segments.length > 1 && <div><p className="mb-1 font-semibold text-slate-300">Journey legs</p>{route.segments.map((seg, i) => <p key={`${seg.from}-${i}`} className="text-slate-400">{seg.from} → {seg.to} · {seg.departure}–{seg.arrival}</p>)}</div>}
            {sources.some((s) => s.timestamp || s.bookingUrl) && <div><p className="mb-1 font-semibold text-slate-300">Source details</p>{sources.map((s, i) => <p key={`${s.name}-${i}`} className="text-slate-400">{s.name}{s.timestamp ? ` · ${s.timestamp}` : ''}{isBookingUrl(s.bookingUrl) ? ' · booking link available' : ''}</p>)}</div>}
            {!detailsAvailable && <p className="text-slate-500">No additional operator, vehicle, or provider detail was returned for this option.</p>}
          </div>
        )}
      </div>
    </Card>
  );
}

