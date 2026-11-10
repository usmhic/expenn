/**
 * Trip-planning helpers shared by the planner, trip cards and itinerary views.
 */

import type { ItineraryDto, PlaceDto, RouteOptionsDto, RouteProfile, RoutingStatusDto, SaveItineraryRequest } from "@/lib/api-client";

export const ROUTE_PROFILES: { value: RouteProfile; label: string; short: string }[] = [
  { value: "driving-car", label: "Car", short: "Drive" },
  { value: "driving-hgv", label: "Van / truck", short: "Truck" },
  { value: "cycling-regular", label: "Bike", short: "Cycle" },
  { value: "foot-walking", label: "Walk", short: "Walk" },
];

export const STOP_KINDS = [
  { value: "stop", label: "Stop" },
  { value: "stay", label: "Overnight stay" },
  { value: "meeting", label: "Meeting" },
  { value: "transit", label: "Transit" },
] as const;

/**
 * MapLibre style URLs. OpenFreeMap serves free OpenStreetMap vector tiles with no key;
 * self-hosters can point these at their own tile server.
 */
export const MAP_STYLE_LIGHT = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";
export const MAP_STYLE_DARK = process.env.NEXT_PUBLIC_MAP_STYLE_URL_DARK || "https://tiles.openfreemap.org/styles/dark";

export function formatDistance(meters?: number | null) {
  if (meters === null || meters === undefined) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km >= 100 ? Math.round(km).toLocaleString("en") : km.toFixed(1)} km`;
}

export function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return "—";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} d ${hours % 24} h`;
  }
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function tripDays(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1);
}

export function tripPhase(start: string, end: string, now = new Date()) {
  const s = new Date(start);
  const e = new Date(end);
  e.setHours(23, 59, 59, 999);
  if (now < s) return { kind: "upcoming" as const, days: Math.ceil((s.getTime() - now.getTime()) / 86_400_000) };
  if (now > e) return { kind: "past" as const, days: 0 };
  return { kind: "ongoing" as const, days: Math.floor((now.getTime() - s.getTime()) / 86_400_000) + 1 };
}

export function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  const sameMonth = sameYear && s.getUTCMonth() === e.getUTCMonth();
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en", { ...opts, timeZone: "UTC" }).format(d);
  if (sameMonth) return `${fmt(s, { month: "short", day: "numeric" })} – ${fmt(e, { day: "numeric" })}, ${fmt(e, { year: "numeric" })}`;
  if (sameYear) return `${fmt(s, { month: "short", day: "numeric" })} – ${fmt(e, { month: "short", day: "numeric" })}, ${fmt(e, { year: "numeric" })}`;
  return `${fmt(s, { month: "short", day: "numeric", year: "numeric" })} – ${fmt(e, { month: "short", day: "numeric", year: "numeric" })}`;
}

/* ── Browser calls through the same-origin proxy (app/api/proxy) ──────────── */

async function proxy<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api/proxy/${path}`, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new Error(data?.error ?? data?.title ?? `Request failed (${res.status})`);
  return data as T;
}

export const plannerApi = {
  status: () => proxy<RoutingStatusDto>("routing/status"),
  search: (q: string, near?: { lat: number; lon: number }) => {
    const qs = new URLSearchParams({ q, limit: "6" });
    if (near) {
      qs.set("lat", String(near.lat));
      qs.set("lon", String(near.lon));
    }
    return proxy<PlaceDto[]>(`places/search?${qs}`);
  },
  reverse: (lat: number, lon: number) => proxy<PlaceDto>(`places/reverse?lat=${lat}&lon=${lon}`),
  directions: (profile: RouteProfile, coordinates: [number, number][], alternatives: boolean) =>
    proxy<RouteOptionsDto>("routing/directions", { method: "POST", body: { profile, coordinates, alternatives } }),
  optimize: (profile: RouteProfile, coordinates: [number, number][]) =>
    proxy<{ order: number[] }>("routing/optimize", { method: "POST", body: { profile, coordinates, keepStart: true, keepEnd: true } }),
  itinerary: (tripId: string) => proxy<ItineraryDto>(`trips/${tripId}/itinerary`),
  save: (tripId: string, body: SaveItineraryRequest) => proxy<ItineraryDto>(`trips/${tripId}/itinerary`, { method: "PUT", body }),
};
