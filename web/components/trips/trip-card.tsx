import Link from "next/link";
import { CalendarDays, MapPin, Route as RouteIcon, Users } from "lucide-react";
import { StatusBadge } from "@/components/layout/navigation";
import type { TripDto } from "@/lib/api-client";
import { formatMoney } from "@/lib/expenses";
import { formatDateRange, formatDistance, tripPhase } from "@/lib/trips";
import { cn } from "@/lib/utils";

/** A tiny SVG drawing of the planned route, projected to fit its box. */
export function RouteThumbnail({ points, className }: { points?: [number, number][] | null; className?: string }) {
  if (!points || points.length < 2) {
    return (
      <div className={cn("flex items-center justify-center text-subtle", className)}>
        <RouteIcon className="size-6" />
      </div>
    );
  }
  // Equirectangular projection scaled by cos(latitude) so shapes look right.
  const midLat = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const xs = points.map((p) => p[0] * kx);
  const ys = points.map((p) => -p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = 160, h = 96, pad = 14;
  const scale = Math.min((w - pad * 2) / Math.max(maxX - minX, 1e-6), (h - pad * 2) / Math.max(maxY - minY, 1e-6));
  const ox = (w - (maxX - minX) * scale) / 2, oy = (h - (maxY - minY) * scale) / 2;
  const coords = xs.map((x, i) => [ox + (x - minX) * scale, oy + (ys[i] - minY) * scale] as const);
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [sx, sy] = coords[0];
  const [ex, ey] = coords[coords.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} role="img" aria-label="Route preview">
      <defs>
        <pattern id="route-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" className="fill-border-strong" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#route-dots)" />
      <path d={d} fill="none" className="stroke-card" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sx} cy={sy} r="4.5" className="fill-card stroke-primary" strokeWidth="2.5" />
      <circle cx={ex} cy={ey} r="4.5" className="fill-primary stroke-card" strokeWidth="2" />
    </svg>
  );
}

export function TripCard({ trip, href, travelers, pending }: { trip: TripDto; href: string; travelers?: number; pending?: number }) {
  const phase = tripPhase(trip.startDate, trip.endDate);
  return (
    <Link href={href} className="card card-flush card-interactive group flex flex-col">
      <div className="relative h-28 border-b border-border bg-muted/50">
        <RouteThumbnail points={trip.routePreview} className="h-full w-full" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <StatusBadge value={trip.status} />
          {pending ? <StatusBadge value="requested" label={`${pending} to approve`} /> : null}
        </div>
        <span
          className={cn(
            "absolute right-3 top-3 rounded-full bg-card/90 px-2 py-0.5 text-[0.6875rem] font-semibold shadow-xs",
            phase.kind === "ongoing" ? "text-teal-700 dark:text-teal-300" : "text-muted-foreground"
          )}
        >
          {phase.kind === "ongoing" ? `Day ${phase.days}` : phase.kind === "upcoming" ? `In ${phase.days} d` : "Ended"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-sans text-[0.9375rem] font-semibold group-hover:text-primary">{trip.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{trip.routeSummary ?? trip.destination}</span>
          </p>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{formatDateRange(trip.startDate, trip.endDate)}</span>
          {trip.routeDistanceMeters ? <span className="flex items-center gap-1"><RouteIcon className="size-3.5" />{formatDistance(trip.routeDistanceMeters)}</span> : null}
          {travelers !== undefined && <span className="flex items-center gap-1"><Users className="size-3.5" />{travelers}</span>}
          {trip.budget > 0 && <span className="ml-auto font-medium text-foreground tabular-nums">{formatMoney(trip.budget, trip.currency, { compact: true })}</span>}
        </div>
      </div>
    </Link>
  );
}
