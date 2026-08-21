import type {
    SavedTrip,
    TravelCrisis,
    TravelRoute,
} from '@/types/travel';

const STORAGE_KEY = 'travelops-saved-trips-v1';
const MAX_SAVED_TRIPS = 25;

export function getSavedTrips(): SavedTrip[] {
    if (typeof window === 'undefined') return [];

    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);

        if (!saved) return [];

        const trips = JSON.parse(saved) as SavedTrip[];

        return Array.isArray(trips)
            ? trips.sort(
                (first, second) =>
                    new Date(second.savedAt).getTime() -
                    new Date(first.savedAt).getTime()
            )
            : [];
    } catch {
        return [];
    }
}

export function saveSelectedTrip(
    crisis: TravelCrisis,
    route: TravelRoute
): SavedTrip {
    const savedTrip: SavedTrip = {
        id: `saved-trip-${Date.now()}`,
        origin: crisis.origin,
        destination: crisis.destination,
        crisisType: crisis.crisisType,
        status: 'resolved',
        finalPrice: route.totalPrice,
        currency: route.currency || crisis.currency,
        finalArrival: route.finalArrival,
        date: new Date().toISOString().slice(0, 10),
        primaryMode: route.primaryMode,
        travelTime: route.travelTime,
        riskLevel: route.riskLevel,
        selectedRouteId: route.id,
        priceAvailable: route.priceAvailable ?? true,
        savedAt: new Date().toISOString(),
    };

    const currentTrips = getSavedTrips();

    const updatedTrips = [savedTrip, ...currentTrips].slice(
        0,
        MAX_SAVED_TRIPS
    );

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTrips));

    return savedTrip;
}

export function clearSavedTrips() {
    if (typeof window === 'undefined') return;

    window.localStorage.removeItem(STORAGE_KEY);
}