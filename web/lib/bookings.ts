/**
 * Trip types, booking vocabulary and "find & book" search links shared by the trip pages.
 * Expenn doesn't sell travel: search links open the provider with the trip's dates filled in,
 * and the confirmed booking is saved back to the trip with its price.
 */

import type { BookingKind, TripBookingDto, TripKind } from "@/lib/api-client";

export const TRIP_KINDS: { value: TripKind; label: string; hint: string }[] = [
  { value: "business", label: "Business", hint: "Work travel, reviewed and reimbursed" },
  { value: "personal", label: "Solo", hint: "Just you" },
  { value: "family", label: "Family", hint: "You and your family" },
  { value: "group", label: "Group", hint: "Friends or a team event" },
];

export function tripKindLabel(kind?: string) {
  return TRIP_KINDS.find((k) => k.value === kind)?.label ?? "Business";
}

/** Kinds offered when creating a trip: company workspaces plan business and group trips. */
export function tripKindsFor(personal: boolean) {
  return personal
    ? TRIP_KINDS.filter((k) => k.value !== "business")
    : TRIP_KINDS.filter((k) => k.value === "business" || k.value === "group");
}

export const BOOKING_KINDS: { value: BookingKind; label: string; titleHint: string }[] = [
  { value: "flight", label: "Flight", titleHint: "LH 400 Frankfurt → New York" },
  { value: "hotel", label: "Stay", titleHint: "Hotel Adlon, 3 nights" },
  { value: "car", label: "Car rental", titleHint: "Sixt compact, airport pickup" },
  { value: "train", label: "Train", titleHint: "ICE 1004 Berlin → Munich" },
  { value: "bus", label: "Bus", titleHint: "FlixBus Prague → Vienna" },
  { value: "ferry", label: "Ferry", titleHint: "Dover → Calais" },
  { value: "activity", label: "Event / ticket", titleHint: "Conference pass" },
  { value: "other", label: "Other", titleHint: "Visa fee, travel insurance…" },
];

export function bookingKindLabel(kind: string) {
  return BOOKING_KINDS.find((k) => k.value === kind)?.label ?? "Booking";
}

/** Matches the API's mapping (Domain/Travel/TripBookings.CategoryFor). */
export function bookingCategory(kind: string) {
  switch (kind) {
    case "flight": return "Airfare";
    case "hotel": return "Lodging";
    case "car": case "train": case "bus": case "ferry": return "Ground transport";
    case "activity": return "Conference & training";
    default: return "Other";
  }
}

/** Which side of a booking's times to label: a stay checks in/out, transport departs/arrives. */
export function bookingTimeLabels(kind: string): [string, string] {
  if (kind === "hotel") return ["Check-in", "Check-out"];
  if (kind === "car") return ["Pick-up", "Drop-off"];
  if (kind === "activity" || kind === "other") return ["Starts", "Ends"];
  return ["Departs", "Arrives"];
}

/** "Mon 9 Nov, 10:15" from a local "2026-11-09T10:15:00" (no time zone shift). */
export function formatLocalDateTime(value?: string) {
  if (!value) return "";
  const [date, time = ""] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const day = new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)));
  const hhmm = time.slice(0, 5);
  return hhmm && hhmm !== "00:00" ? `${day}, ${hhmm}` : day;
}

/** Nights between two local dates, for stays. */
export function nightsBetween(start?: string, end?: string) {
  if (!start || !end) return null;
  const a = Date.parse(start.slice(0, 10));
  const b = Date.parse(end.slice(0, 10));
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null;
  return Math.round((b - a) / 86_400_000);
}

export type SearchLink = { label: string; href: string };

/**
 * Provider searches prefilled from the trip. Only well-known, stable URL formats are used;
 * ground transport needs a starting point, so it offers nothing without one.
 */
export function searchLinks(
  kind: BookingKind,
  opts: { origin?: string; destination: string; start: string; end: string; people: number },
): SearchLink[] {
  const start = opts.start.slice(0, 10);
  const end = opts.end.slice(0, 10);
  const dest = opts.destination.trim();
  const from = opts.origin?.trim() ?? "";
  const people = Math.max(1, opts.people);
  const enc = encodeURIComponent;

  switch (kind) {
    case "flight": {
      const q = from
        ? `Flights from ${from} to ${dest} on ${start} through ${end}`
        : `Flights to ${dest} on ${start} through ${end}`;
      return [{ label: "Google Flights", href: `https://www.google.com/travel/flights?q=${enc(q)}` }];
    }
    case "hotel":
      return [
        { label: "Booking.com", href: `https://www.booking.com/searchresults.html?ss=${enc(dest)}&checkin=${start}&checkout=${end}&group_adults=${people}&no_rooms=1` },
        { label: "Airbnb", href: `https://www.airbnb.com/s/${enc(dest)}/homes?checkin=${start}&checkout=${end}&adults=${people}` },
      ];
    case "car":
      return [{ label: "Kayak cars", href: `https://www.kayak.com/cars/${enc(dest)}/${start}/${end}` }];
    case "activity":
      return [{ label: "GetYourGuide", href: `https://www.getyourguide.com/s/?q=${enc(dest)}` }];
    case "train":
    case "bus":
    case "ferry":
      return from ? [{ label: "Rome2Rio", href: `https://www.rome2rio.com/map/${enc(from)}/${enc(dest)}` }] : [];
    default:
      return [];
  }
}

export function sortBookings(bookings: TripBookingDto[]) {
  return [...bookings].sort((a, b) => {
    if (!a.startsAt && !b.startsAt) return a.createdAt.localeCompare(b.createdAt);
    if (!a.startsAt) return 1;
    if (!b.startsAt) return -1;
    return a.startsAt.localeCompare(b.startsAt);
  });
}
