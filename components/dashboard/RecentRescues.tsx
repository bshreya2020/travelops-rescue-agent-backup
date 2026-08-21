'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BusFront,
  CheckCircle,
  CircleAlert,
  Plane,
  TrainFront,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CRISIS_TYPE_LABELS } from '@/lib/demoMode';
import { getSavedTrips } from '@/services/tripHistoryService';
import type { SavedTrip } from '@/types/travel';

function TransportIcon({ mode }: { mode: SavedTrip['primaryMode'] }) {
  if (mode === 'flight') {
    return <Plane size={16} className="text-cyan-400" />;
  }

  if (mode === 'train') {
    return <TrainFront size={16} className="text-violet-400" />;
  }

  if (mode === 'bus') {
    return <BusFront size={16} className="text-orange-400" />;
  }

  return <CircleAlert size={16} className="text-slate-400" />;
}

export function RecentRescues() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);

  useEffect(() => {
    const refreshTrips = () => setTrips(getSavedTrips());

    refreshTrips();
    window.addEventListener('storage', refreshTrips);

    return () => window.removeEventListener('storage', refreshTrips);
  }, []);

  return (
    <div className="mb-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Saved Rescues
        </h2>

        <Link
          href="/crisis/new"
          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
        >
          Start a new rescue
        </Link>
      </div>

      {trips.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="font-semibold text-white">No saved rescues yet</p>
          <p className="mt-2 text-sm text-slate-400">
            Search for routes, choose the best flight, train, or bus option,
            and press “Select This Route” to save it here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <Card key={trip.id} className="fade-slide-up" padding="md">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <TransportIcon mode={trip.primaryMode} />
                    <p className="text-sm font-semibold text-white">
                      {trip.origin} → {trip.destination}
                    </p>
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    {CRISIS_TYPE_LABELS[trip.crisisType]}
                  </p>
                </div>

                <CheckCircle
                  size={18}
                  className="flex-shrink-0 text-green-400"
                />
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <Badge variant="success">
                    {trip.primaryMode.toUpperCase()}
                  </Badge>

                  <p className="mt-2 text-xs text-slate-500">
                    Travel time: {trip.travelTime}
                  </p>
                  <p className="text-xs text-slate-500">
                    Arrival: {trip.finalArrival}
                  </p>
                </div>

                <div className="text-right">
                  {trip.priceAvailable ? (
                    <p className="text-sm font-bold text-cyan-400">
                      {trip.currency}
                      {trip.finalPrice.toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-yellow-400">
                      Fare unavailable
                    </p>
                  )}

                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(trip.savedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}