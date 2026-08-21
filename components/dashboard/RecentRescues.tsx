'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  BusFront,
  CheckCircle,
  CircleAlert,
  Plane,
  TrainFront,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CRISIS_TYPE_LABELS } from '@/lib/demoMode';
import { getSavedTrips, deleteTripsByIds } from '@/services/tripHistoryService';
import type { SavedTrip } from '@/types/travel';

function TransportIcon({ mode }: { mode: SavedTrip['primaryMode'] }) {
  if (mode === 'flight') return <Plane size={16} className="text-cyan-400" />;
  if (mode === 'train') return <TrainFront size={16} className="text-violet-400" />;
  if (mode === 'bus') return <BusFront size={16} className="text-orange-400" />;
  return <CircleAlert size={16} className="text-slate-400" />;
}

// ── Confirmation dialog ───────────────────────────────────────
function ConfirmDialog({
  count,
  all,
  onConfirm,
  onCancel,
}: {
  count: number;
  all: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-base font-bold text-white mb-2">
          {all ? 'Delete all saved trips?' : `Delete ${count} trip${count !== 1 ? 's' : ''}?`}
        </h3>
        <p className="text-sm text-slate-400 mb-6">
          {all
            ? 'This will permanently clear your entire rescue history.'
            : 'This action will permanently remove the selected trips from your rescue history.'}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-300 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 border border-red-500/50 text-sm font-semibold text-white hover:bg-red-500 transition flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            {all ? 'Delete All' : `Delete`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-slate-800 border border-slate-600 text-sm text-white shadow-xl flex items-center gap-2">
      <CheckCircle size={15} className="text-green-400 flex-shrink-0" />
      {message}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function RecentRescues() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ ids: string[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const refresh = () => setTrips(getSavedTrips());

  useEffect(() => {
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  // Keep select-all checkbox in sync (indeterminate state)
  useEffect(() => {
    if (!selectAllRef.current) return;
    if (trips.length === 0) {
      selectAllRef.current.indeterminate = false;
      selectAllRef.current.checked = false;
    } else if (selected.size === trips.length) {
      selectAllRef.current.indeterminate = false;
      selectAllRef.current.checked = true;
    } else if (selected.size > 0) {
      selectAllRef.current.indeterminate = true;
      selectAllRef.current.checked = false;
    } else {
      selectAllRef.current.indeterminate = false;
      selectAllRef.current.checked = false;
    }
  }, [selected, trips]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === trips.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(trips.map((t) => t.id)));
    }
  };

  const requestDelete = (ids: string[]) => setConfirm({ ids });

  const confirmDelete = () => {
    if (!confirm) return;
    const count = confirm.ids.length;
    deleteTripsByIds(confirm.ids);
    setSelected((prev) => {
      const next = new Set(prev);
      confirm.ids.forEach((id) => next.delete(id));
      return next;
    });
    refresh();
    setConfirm(null);
    setToast(count === 1 ? 'Trip deleted successfully.' : `${count} trips deleted successfully.`);
  };

  const selCount = selected.size;
  const allSelected = trips.length > 0 && selCount === trips.length;

  return (
    <div className="mb-12">
      {/* ── Header row ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Saved Rescues
          </h2>
          {trips.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400 hover:text-slate-200 select-none">
              <input
                ref={selectAllRef}
                type="checkbox"
                className="w-3.5 h-3.5 accent-cyan-500 cursor-pointer"
                onChange={toggleAll}
              />
              Select All
            </label>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selCount > 0 && (
            <button
              onClick={() => requestDelete([...selected])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/40 text-xs font-semibold text-red-300 hover:bg-red-600/30 transition"
            >
              <Trash2 size={13} />
              {allSelected ? 'Delete All' : `Delete ${selCount} Trip${selCount !== 1 ? 's' : ''}`}
            </button>
          )}
          <Link
            href="/crisis/new"
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
          >
            Start a new rescue
          </Link>
        </div>
      </div>

      {/* ── Empty state ── */}
      {trips.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="font-semibold text-white">No saved rescues yet</p>
          <p className="mt-2 text-sm text-slate-400">
            Search for routes, choose the best flight, train, or bus option, and press "Select This Route" to save it here.
          </p>
          <Link
            href="/crisis/new"
            className="mt-4 inline-block px-4 py-2 rounded-lg bg-cyan-600 text-sm font-semibold text-white hover:bg-cyan-500 transition"
          >
            Start a New Rescue
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => {
            const isSelected = selected.has(trip.id);
            return (
              <Card
                key={trip.id}
                className={`fade-slide-up relative transition-all ${isSelected ? 'ring-2 ring-cyan-500/60 border-cyan-500/40' : ''}`}
                padding="md"
              >
                {/* Checkbox */}
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(trip.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Individual delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); requestDelete([trip.id]); }}
                  className="absolute top-3 right-3 z-10 p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                  title="Delete this trip"
                >
                  <Trash2 size={14} />
                </button>

                {/* Card content — unchanged from original, just with padding for checkbox */}
                <div className="pl-6 pr-6">
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
                    <CheckCircle size={18} className="flex-shrink-0 text-green-400 mt-0.5" />
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <Badge variant="success">{trip.primaryMode.toUpperCase()}</Badge>
                      <p className="mt-2 text-xs text-slate-500">Travel time: {trip.travelTime}</p>
                      <p className="text-xs text-slate-500">Arrival: {trip.finalArrival}</p>
                    </div>
                    <div className="text-right">
                      {trip.priceAvailable ? (
                        <p className="text-sm font-bold text-cyan-400">
                          {trip.currency}{trip.finalPrice.toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-xs font-medium text-yellow-400">Fare unavailable</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(trip.savedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirm && (
        <ConfirmDialog
          count={confirm.ids.length}
          all={confirm.ids.length === trips.length}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
