"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight, BedDouble, Bus, Car, ExternalLink, Package, Pencil, Plane, Plus, Search, Ship, Ticket, TrainFront, Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubmitButton } from "@/components/ui/submit-button";
import { CreateExpenseDialog } from "@/components/dialogs";
import { StatusBadge } from "@/components/layout/navigation";
import { deleteBookingAction, saveBookingDialogAction, type DialogState } from "@/app/dialog-actions";
import type { BookingKind, TripBookingDto } from "@/lib/api-client";
import {
  BOOKING_KINDS, bookingCategory, bookingKindLabel, bookingTimeLabels, formatLocalDateTime, nightsBetween, searchLinks, sortBookings,
} from "@/lib/bookings";
import { COMMON_CURRENCIES, formatMoney } from "@/lib/expenses";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<string, typeof Plane> = {
  flight: Plane, hotel: BedDouble, car: Car, train: TrainFront, bus: Bus, ferry: Ship, activity: Ticket, other: Package,
};

const RECEIPT_LABELS: Record<string, string> = {
  draft: "Receipt saved", submitted: "Receipt in review", approved: "Receipt approved", reimbursed: "Reimbursed", rejected: "Receipt sent back",
};

export type BookingTrip = {
  id: string;
  name: string;
  currency: string;
  status?: string;
  destination: string;
  startDate: string;
  endDate: string;
  /** People the trip covers; prefills traveler counts and searches. */
  partySize: number;
  /** First stop, used as the default origin for transport searches. */
  origin?: string;
};

/**
 * Flights, stays, rentals and tickets for a trip. "Find & book" opens a provider search with the
 * trip's dates; once booked, the confirmation and price are saved here and count toward the trip
 * total until a receipt is added, after which the receipt counts instead.
 */
export function TripBookings({
  trip,
  bookings,
  canEdit,
  company,
}: {
  trip: BookingTrip;
  bookings: TripBookingDto[];
  canEdit: boolean;
  company: boolean;
}) {
  const [editing, setEditing] = useState<TripBookingDto | { kind: BookingKind } | null>(null);
  const sorted = sortBookings(bookings);

  return (
    <section className="card card-flush" aria-labelledby="trip-bookings-title">
      <div className="card-header flex-wrap gap-y-2">
        <div className="min-w-0">
          <h2 id="trip-bookings-title" className="card-title">Bookings</h2>
          <p className="card-subtitle">Flights, stays, rentals and tickets for this trip</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <FindAndBook trip={trip} />
            <button type="button" className="primary-button button-sm" onClick={() => setEditing({ kind: "flight" })}>
              <Plus className="size-4" /> Add booking
            </button>
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm font-medium">Nothing booked yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Search with a provider, book there, then save the confirmation here so its price counts toward the trip.
          </p>
          {canEdit && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {(["flight", "hotel", "car", "train"] as const).map((k) => {
                const Icon = KIND_ICONS[k];
                return (
                  <button key={k} type="button" className="chip chip-button" onClick={() => setEditing({ kind: k })}>
                    <Icon className="size-3.5" /> {bookingKindLabel(k)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <ul className="divide-list">
          {sorted.map((b) => (
            <BookingRow key={b.id} booking={b} trip={trip} canEdit={canEdit} company={company} onEdit={() => setEditing(b)} />
          ))}
        </ul>
      )}

      {editing && (
        <BookingDialog
          trip={trip}
          booking={"id" in editing ? editing : undefined}
          initialKind={editing.kind}
          company={company}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function BookingRow({
  booking: b, trip, canEdit, company, onEdit,
}: { booking: TripBookingDto; trip: BookingTrip; canEdit: boolean; company: boolean; onEdit: () => void }) {
  const Icon = KIND_ICONS[b.kind] ?? Package;
  const [startLabel] = bookingTimeLabels(b.kind);
  const nights = b.kind === "hotel" ? nightsBetween(b.startsAt, b.endsAt) : null;
  const cancelled = b.status === "cancelled";
  const when = [formatLocalDateTime(b.startsAt), b.endsAt ? formatLocalDateTime(b.endsAt) : null].filter(Boolean).join(" → ");

  return (
    <li className={cn("flex flex-wrap items-start gap-3 px-5 py-3.5", cancelled && "opacity-60")}>
      <span className="icon-tile size-9 shrink-0"><Icon className="size-4" /></span>
      <div className="min-w-0 flex-1 basis-56">
        <p className={cn("truncate text-sm font-medium", cancelled && "line-through")}>{b.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[bookingKindLabel(b.kind), b.provider, b.reference && `Ref ${b.reference}`].filter(Boolean).join(" · ")}
        </p>
        {(b.origin || b.destination) && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            {b.origin}{b.origin && b.destination && <ArrowRight className="size-3 shrink-0" />}{b.destination}
          </p>
        )}
        {when && (
          <p className="mt-0.5 text-xs text-muted-foreground" title={startLabel}>
            {when}{nights ? ` · ${nights} night${nights === 1 ? "" : "s"}` : ""}{b.travelers > 1 ? ` · ${b.travelers} travelers` : ""}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge value={b.status} />
          {company && <span className="chip text-[0.7rem]">{b.paidBy === "company" ? "Company paid" : "Paid by you"}</span>}
          {b.expenseId && <StatusBadge value={b.expenseStatus ?? "draft"} label={RECEIPT_LABELS[b.expenseStatus ?? "draft"]} />}
          {b.bookingUrl && (
            <a href={b.bookingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Manage booking <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
      <div className="ml-auto flex flex-col items-end gap-1.5">
        <span className="text-sm font-semibold tabular-nums">{b.amount > 0 ? formatMoney(b.amount, b.currency) : "—"}</span>
        {canEdit && (
          <div className="flex items-center gap-1">
            {!b.expenseId && !cancelled && b.amount > 0 && (
              <CreateExpenseDialog
                trips={[{ id: trip.id, name: trip.name, currency: trip.currency, status: trip.status }]}
                defaultCurrency={b.currency}
                title="Add receipt for this booking"
                triggerLabel="Receipt"
                triggerClassName="secondary-button button-sm"
                defaults={{
                  tripId: trip.id,
                  bookingId: b.id,
                  merchant: (b.provider || b.title).slice(0, 120),
                  amount: b.amount,
                  currency: b.currency,
                  category: bookingCategory(b.kind),
                  expenseDate: (b.startsAt ?? new Date().toISOString()).slice(0, 10),
                  paymentMethod: b.paidBy === "company" ? "company_card" : "personal_card",
                  reimbursable: !company ? false : b.paidBy === "personal",
                  notes: [b.title, b.reference && `Ref ${b.reference}`].filter(Boolean).join(" · "),
                }}
              />
            )}
            <button type="button" className="icon-button size-8" onClick={onEdit} aria-label={`Edit ${b.title}`}>
              <Pencil className="size-3.5" />
            </button>
            <DeleteBooking tripId={trip.id} bookingId={b.id} title={b.title} />
          </div>
        )}
      </div>
    </li>
  );
}

function FindAndBook({ trip }: { trip: BookingTrip }) {
  const opts = { origin: trip.origin, destination: trip.destination, start: trip.startDate, end: trip.endDate, people: trip.partySize };
  const groups = BOOKING_KINDS.map((k) => ({ kind: k, links: searchLinks(k.value, opts) })).filter((g) => g.links.length > 0);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="secondary-button button-sm"><Search className="size-4" /> Find &amp; book</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Opens the provider with {trip.destination} and your dates. Save the confirmation here after booking.
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {groups.map(({ kind, links }) => {
          const Icon = KIND_ICONS[kind.value];
          return links.map((l) => (
            <DropdownMenuItem key={l.href} asChild>
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                <span className="flex-1">{kind.label}</span>
                <span className="text-xs text-muted-foreground">{l.label}</span>
                <ExternalLink className="size-3 text-muted-foreground" />
              </a>
            </DropdownMenuItem>
          ));
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeleteBooking({ tripId, bookingId, title }: { tripId: string; bookingId: string; title: string }) {
  const router = useRouter();
  const [state, action] = useActionState(deleteBookingAction, null as DialogState);
  useEffect(() => {
    if (state?.success) { toast.success("Booking removed."); router.refresh(); }
    else if (state?.error) toast.error(state.error);
  }, [state, router]);
  return (
    <form
      action={action}
      onSubmit={(e) => { if (!confirm(`Remove “${title}”? A receipt already filed for it stays on the trip.`)) e.preventDefault(); }}
    >
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <button type="submit" className="icon-button size-8 text-muted-foreground hover:text-destructive" aria-label={`Remove ${title}`}>
        <Trash2 className="size-3.5" />
      </button>
    </form>
  );
}

function BookingDialog({
  trip, booking, initialKind, company, onClose,
}: {
  trip: BookingTrip;
  booking?: TripBookingDto;
  initialKind: BookingKind;
  company: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<BookingKind>(booking?.kind ?? initialKind);
  const [state, action] = useActionState(saveBookingDialogAction, null as DialogState);
  const [startLabel, endLabel] = bookingTimeLabels(kind);
  const meta = BOOKING_KINDS.find((k) => k.value === kind) ?? BOOKING_KINDS[0];
  const transport = ["flight", "train", "bus", "ferry"].includes(kind);
  const currencies = Array.from(new Set([booking?.currency ?? trip.currency, ...COMMON_CURRENCIES]));
  const tripStart = trip.startDate.slice(0, 10);
  const tripEnd = trip.endDate.slice(0, 10);

  useEffect(() => {
    if (!state?.success) return;
    startTransition(() => onClose());
    toast.success(booking ? "Booking updated." : "Booking saved to the trip.");
    router.refresh();
  }, [state, router, onClose, booking]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{booking ? "Edit booking" : "Add a booking"}</DialogTitle>
          <p className="text-sm text-muted-foreground">Save what you booked so its price counts toward the trip total.</p>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          {state?.error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{state.error}</div>
          )}
          <input type="hidden" name="tripId" value={trip.id} />
          {booking && <input type="hidden" name="bookingId" value={booking.id} />}
          <input type="hidden" name="kind" value={kind} />

          <fieldset>
            <legend className="mb-2 text-[0.8125rem] font-semibold">Type</legend>
            <div className="flex flex-wrap gap-1.5" role="radiogroup">
              {BOOKING_KINDS.map((k) => {
                const Icon = KIND_ICONS[k.value];
                return (
                  <button
                    key={k.value}
                    type="button"
                    role="radio"
                    aria-checked={kind === k.value}
                    className="chip chip-button"
                    onClick={() => setKind(k.value)}
                  >
                    <Icon className="size-3.5" /> {k.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field sm:col-span-2">
              Title
              <input name="title" required minLength={2} defaultValue={booking?.title} placeholder={`e.g. ${meta.titleHint}`} className="form-control" />
            </label>
            <label className="field">
              {kind === "flight" ? "Airline" : kind === "hotel" ? "Hotel or host" : "Provider"} <span className="field-hint">Optional</span>
              <input name="provider" defaultValue={booking?.provider} className="form-control" />
            </label>
            <label className="field">
              Confirmation code <span className="field-hint">Optional</span>
              <input name="reference" defaultValue={booking?.reference} className="form-control font-mono uppercase" />
            </label>
            {transport && (
              <label className="field">
                From
                <input name="origin" defaultValue={booking?.origin ?? (booking ? "" : trip.origin)} placeholder="City, station or airport" className="form-control" />
              </label>
            )}
            <label className={cn("field", !transport && "sm:col-span-2")}>
              {transport ? "To" : "Address or place"} <span className="field-hint">Optional</span>
              <input name="destination" defaultValue={booking?.destination ?? (booking ? "" : trip.destination)} className="form-control" />
            </label>
            <label className="field">
              {startLabel}
              <input
                name="startsAt"
                type="datetime-local"
                defaultValue={booking?.startsAt?.slice(0, 16) ?? (booking ? "" : `${tripStart}T${kind === "hotel" ? "15:00" : "09:00"}`)}
                className="form-control"
              />
            </label>
            <label className="field">
              {endLabel} <span className="field-hint">Optional</span>
              <input
                name="endsAt"
                type="datetime-local"
                defaultValue={booking?.endsAt?.slice(0, 16) ?? (booking || kind !== "hotel" ? "" : `${tripEnd}T11:00`)}
                className="form-control"
              />
            </label>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_5.5rem] gap-2">
            <label className="field">
              Total price
              <input name="amount" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={booking?.amount || ""} placeholder="0.00" className="form-control tabular-nums" />
            </label>
            <label className="field">
              Currency
              <select name="currency" defaultValue={booking?.currency ?? trip.currency} className="form-control">
                {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="field">
              People
              <input name="travelers" type="number" min="1" max="50" defaultValue={booking?.travelers ?? trip.partySize} className="form-control tabular-nums" />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              Status
              <select name="status" defaultValue={booking?.status ?? "booked"} className="form-control">
                <option value="booked">Booked and confirmed</option>
                <option value="planned">Planned — estimate, not booked yet</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            {company ? (
              <label className="field">
                Paid by
                <select name="paidBy" defaultValue={booking?.paidBy ?? "personal"} className="form-control">
                  <option value="personal">Me — I&apos;ll claim it back</option>
                  <option value="company">The company</option>
                </select>
              </label>
            ) : (
              <input type="hidden" name="paidBy" value="personal" />
            )}
            <label className="field sm:col-span-2">
              Booking link <span className="field-hint">Optional</span>
              <input name="bookingUrl" type="url" defaultValue={booking?.bookingUrl} placeholder="https://…" className="form-control" />
            </label>
            <label className="field sm:col-span-2">
              Notes <span className="field-hint">Optional</span>
              <textarea name="notes" rows={2} defaultValue={booking?.notes} placeholder="Seat, room type, baggage, cancellation policy…" className="form-control" />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <SubmitButton pendingText="Saving…" className="primary-button">{booking ? "Save changes" : "Save booking"}</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
