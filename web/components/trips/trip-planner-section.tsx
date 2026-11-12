"use client";

import { CreateExpenseDialog } from "@/components/dialogs";
import { TripPlanner } from "@/components/trips/trip-planner";
import type { ItineraryDto } from "@/lib/api-client";
import { ROUTE_PROFILES, formatDistance } from "@/lib/trips";
import { todayIso } from "@/lib/expenses";

/**
 * The planner as used on trip pages. Travelers on the trip can turn the planned
 * route into a mileage claim; the distance and route are prefilled, the amount is theirs to set.
 */
export function TripPlannerSection({
  trip,
  itinerary,
  canEdit,
  canClaimMileage,
}: {
  trip: { id: string; name: string; currency: string; startDate: string; endDate: string; status?: string };
  itinerary: ItineraryDto;
  canEdit: boolean;
  canClaimMileage: boolean;
}) {
  return (
    <TripPlanner
      tripId={trip.id}
      initial={itinerary}
      startDate={trip.startDate}
      endDate={trip.endDate}
      canEdit={canEdit}
      heightClass="lg:h-[min(46rem,calc(100dvh-8rem))]"
      mileageSlot={
        canClaimMileage
          ? ({ distanceMeters, from, to, profile }) =>
              profile.startsWith("driving") ? (
                <CreateExpenseDialog
                  trips={[{ id: trip.id, name: trip.name, currency: trip.currency, status: trip.status }]}
                  defaultCurrency={trip.currency}
                  title="Claim mileage"
                  triggerLabel="Claim mileage"
                  triggerClassName="secondary-button button-sm"
                  defaults={{
                    merchant: `Mileage: ${from} → ${to}`.slice(0, 120),
                    category: "Mileage",
                    tripId: trip.id,
                    currency: trip.currency,
                    expenseDate: todayIso(),
                    paymentMethod: "other",
                    reimbursable: true,
                    notes: `${formatDistance(distanceMeters)} by ${ROUTE_PROFILES.find((p) => p.value === profile)?.label.toLowerCase() ?? "car"} on the planned route (${(distanceMeters / 1000).toFixed(1)} km). Enter the amount using your mileage rate.`,
                  }}
                />
              ) : null
          : undefined
      }
    />
  );
}
