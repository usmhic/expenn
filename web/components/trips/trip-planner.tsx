"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle, Bike, Car, ChevronDown, Footprints, GripVertical, Loader2, MapPin, MousePointerClick,
  Plus, RotateCcw, Route as RouteIcon, Save, Search, Sparkles, Trash2, Truck, X,
} from "lucide-react";
import type { ItineraryDto, PlaceDto, RouteDto, RouteProfile, StopKind } from "@/lib/api-client";
import { ROUTE_PROFILES, STOP_KINDS, formatDistance, formatDuration, plannerApi } from "@/lib/trips";
import { cn } from "@/lib/utils";

const TripMap = dynamic(() => import("@/components/trips/trip-map").then((m) => m.TripMap), {
  ssr: false,
  loading: () => <div className="map-frame h-full w-full animate-pulse" />,
});

type DraftStop = {
  key: string;
  id?: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  arriveOn?: string;
  departOn?: string;
  notes?: string;
  kind: StopKind;
};

const PROFILE_ICONS: Record<RouteProfile, typeof Car> = {
  "driving-car": Car,
  "driving-hgv": Truck,
  "cycling-regular": Bike,
  "foot-walking": Footprints,
};

let keySeq = 0;
const newKey = () => `s${Date.now().toString(36)}${(keySeq++).toString(36)}`;

function fromItinerary(itinerary: ItineraryDto): DraftStop[] {
  return itinerary.stops
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      key: s.id,
      id: s.id,
      name: s.name,
      address: s.address ?? undefined,
      latitude: s.latitude,
      longitude: s.longitude,
      arriveOn: s.arriveOn ?? undefined,
      departOn: s.departOn ?? undefined,
      notes: s.notes ?? undefined,
      kind: s.kind ?? "stop",
    }));
}

function signature(stops: DraftStop[], profile: RouteProfile) {
  return JSON.stringify([profile, stops.map((s) => [s.name, s.address ?? "", s.latitude, s.longitude, s.arriveOn ?? "", s.departOn ?? "", s.notes ?? "", s.kind])]);
}

function routeSignature(stops: DraftStop[], profile: RouteProfile) {
  return JSON.stringify([profile, stops.map((s) => [s.latitude.toFixed(5), s.longitude.toFixed(5)])]);
}

export function TripPlanner({
  tripId,
  initial,
  startDate,
  endDate,
  canEdit = true,
  heightClass = "lg:h-[calc(100dvh-11rem)]",
  mileageSlot,
  onSaved,
}: {
  tripId: string;
  initial: ItineraryDto;
  startDate?: string;
  endDate?: string;
  canEdit?: boolean;
  heightClass?: string;
  /** Optional action rendered under the route summary, e.g. "Log mileage". */
  mileageSlot?: (summary: { distanceMeters: number; from: string; to: string; profile: RouteProfile }) => React.ReactNode;
  onSaved?: (itinerary: ItineraryDto) => void;
}) {
  const router = useRouter();
  const routingEnabled = initial.routingEnabled;
  const [stops, setStops] = useState<DraftStop[]>(() => fromItinerary(initial));
  const [profile, setProfile] = useState<RouteProfile>(initial.profile ?? "driving-car");
  const [routes, setRoutes] = useState<RouteDto[]>(initial.route ? [initial.route] : []);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(initial.routeError ?? null);
  const [saved, setSaved] = useState(() => signature(fromItinerary(initial), initial.profile ?? "driving-car"));
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ lng: number; lat: number; place?: PlaceDto | null; loading: boolean } | null>(null);
  const lastRouted = useRef(initial.route ? routeSignature(fromItinerary(initial), initial.profile ?? "driving-car") : "");

  const dirty = signature(stops, profile) !== saved;
  // Routes only make sense with two or more stops; keep the last result until the next one arrives.
  const visibleRoutes = stops.length >= 2 ? routes : [];
  const route = visibleRoutes[selectedRoute];
  const routeSig = routeSignature(stops, profile);

  // Re-route whenever stop positions or the travel mode change.
  useEffect(() => {
    if (!routingEnabled) return;
    if (stops.length < 2) {
      lastRouted.current = routeSig;
      return;
    }
    if (routeSig === lastRouted.current) return;
    const timer = setTimeout(async () => {
      setRouteLoading(true);
      try {
        const options = await plannerApi.directions(
          profile,
          stops.map((s) => [s.longitude, s.latitude]),
          stops.length === 2,
        );
        lastRouted.current = routeSig;
        setRoutes(options.routes);
        setSelectedRoute(0);
        setRouteError(options.routes.length === 0 ? "No route found between these stops." : null);
      } catch (error) {
        lastRouted.current = routeSig;
        setRoutes([]);
        setRouteError(error instanceof Error ? error.message : "Could not plan a route.");
      } finally {
        setRouteLoading(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [routeSig, routingEnabled, profile, stops]);

  const addStop = useCallback((stop: Omit<DraftStop, "key" | "kind"> & { kind?: StopKind }) => {
    const key = newKey();
    setStops((prev) => [...prev, { key, kind: "stop", ...stop }]);
    setActiveKey(key);
    setDraft(null);
  }, []);

  function updateStop(key: string, patch: Partial<DraftStop>) {
    setStops((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function removeStop(key: string) {
    setStops((prev) => prev.filter((s) => s.key !== key));
    if (expandedKey === key) setExpandedKey(null);
  }

  async function onMapClick(point: { lng: number; lat: number }) {
    if (!canEdit) return;
    setDraft({ ...point, loading: routingEnabled });
    if (!routingEnabled) return;
    try {
      const place = await plannerApi.reverse(point.lat, point.lng);
      setDraft((d) => (d && d.lng === point.lng ? { ...d, place, loading: false } : d));
    } catch {
      setDraft((d) => (d && d.lng === point.lng ? { ...d, place: null, loading: false } : d));
    }
  }

  async function optimize() {
    if (stops.length < 4) return;
    setOptimizing(true);
    try {
      const { order } = await plannerApi.optimize(profile, stops.map((s) => [s.longitude, s.latitude]));
      if (order.length === stops.length) {
        const changed = order.some((value, index) => value !== index);
        setStops((prev) => order.map((i) => prev[i]));
        toast.success(changed ? "Stops reordered for the shortest trip." : "Your order is already the most efficient.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not optimise the route.");
    } finally {
      setOptimizing(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const result = await plannerApi.save(tripId, {
        profile,
        routeIndex: selectedRoute,
        stops: stops.map((s) => ({
          id: s.id,
          name: s.name.trim() || "Untitled stop",
          address: s.address || undefined,
          latitude: s.latitude,
          longitude: s.longitude,
          arriveOn: s.arriveOn || undefined,
          departOn: s.departOn || undefined,
          notes: s.notes || undefined,
          kind: s.kind,
        })),
      });
      const next = fromItinerary(result);
      setStops(next);
      setProfile(result.profile);
      setSaved(signature(next, result.profile));
      lastRouted.current = routeSignature(next, result.profile);
      setRoutes(result.route ? [result.route] : []);
      setSelectedRoute(0);
      setRouteError(result.routeError ?? null);
      if (result.routeError) toast.warning(`Itinerary saved, but the route couldn't be calculated: ${result.routeError}`);
      else toast.success("Itinerary saved.");
      onSaved?.(result);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the itinerary.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    const original = fromItinerary(initial);
    setStops(original);
    setProfile(initial.profile ?? "driving-car");
    setRoutes(initial.route ? [initial.route] : []);
    setSelectedRoute(0);
    lastRouted.current = initial.route ? routeSignature(original, initial.profile ?? "driving-car") : "";
    setSaved(signature(original, initial.profile ?? "driving-car"));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStops((prev) => {
      const from = prev.findIndex((s) => s.key === active.id);
      const to = prev.findIndex((s) => s.key === over.id);
      return arrayMove(prev, from, to);
    });
  }

  const mapStops = useMemo(
    () => stops.map((s) => ({ id: s.key, name: s.name, latitude: s.latitude, longitude: s.longitude, kind: s.kind })),
    [stops],
  );
  const mapRoutes = useMemo(() => visibleRoutes.map((r) => ({ coordinates: r.geometry.coordinates })), [visibleRoutes]);
  const near = stops.length > 0 ? { lat: stops[stops.length - 1].latitude, lon: stops[stops.length - 1].longitude } : undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
      {/* Map: first on phones, right column on desktop */}
      <div className={cn("relative order-first h-[44vh] min-h-[300px] lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-[4.75rem] lg:h-auto lg:min-h-[480px]", heightClass)}>
        <TripMap
          className="h-full w-full border border-border shadow-xs"
          stops={mapStops}
          routes={mapRoutes}
          selectedRoute={selectedRoute}
          activeStopId={activeKey}
          draftPoint={draft ? [draft.lng, draft.lat] : null}
          onMapClick={onMapClick}
          onStopClick={(key) => { setActiveKey(key); setExpandedKey(key); }}
          onRouteClick={(index) => setSelectedRoute(index)}
        />
        {canEdit && stops.length === 0 && !draft && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
            <span className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-soft">
              <MousePointerClick className="size-3.5" /> Search for a place or click the map to add your first stop
            </span>
          </div>
        )}
        {routeLoading && (
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-medium shadow-soft">
            <Loader2 className="size-3.5 animate-spin text-primary" /> Finding the best route…
          </div>
        )}
      </div>

      {/* Itinerary panel */}
      <section className={cn("card card-flush flex min-h-0 flex-col lg:col-start-1 lg:row-start-1", heightClass)} aria-label="Itinerary">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Itinerary</h2>
              <p className="text-xs text-muted-foreground">
                {stops.length === 0 ? "No stops yet" : `${stops.length} stop${stops.length === 1 ? "" : "s"}`}
                {dirty && <span className="ml-1.5 font-medium text-amber-600 dark:text-amber-400">· Unsaved changes</span>}
              </p>
            </div>
            {routingEnabled && (
              <div className="segmented" role="radiogroup" aria-label="Travel mode">
                {ROUTE_PROFILES.map((p) => {
                  const Icon = PROFILE_ICONS[p.value];
                  return (
                    <button
                      key={p.value}
                      type="button"
                      role="radio"
                      aria-checked={profile === p.value}
                      disabled={!canEdit}
                      onClick={() => setProfile(p.value)}
                      className="segmented-item px-2"
                      title={p.label}
                    >
                      <Icon className="size-4" />
                      <span className="sr-only">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {canEdit && (routingEnabled ? (
            <PlaceSearch near={near} onPick={(place) => addStop({ name: place.name, address: place.label, latitude: place.latitude, longitude: place.longitude })} />
          ) : (
            <div className="notice notice-info text-xs">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Place search and routes need OpenRouteService, which isn&apos;t set up on this server. You can still click the map to pin stops.
                An admin can enable it with <code className="rounded bg-muted px-1">OpenRouteService__ApiKey</code>.
              </span>
            </div>
          ))}

          {draft && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-accent/60 p-3">
              <span className="icon-tile icon-tile-primary size-9"><MapPin className="size-4" /></span>
              <div className="min-w-0 flex-1">
                {draft.loading ? (
                  <p className="text-sm text-muted-foreground">Looking up this place…</p>
                ) : (
                  <>
                    <p className="truncate text-sm font-semibold">{draft.place?.name ?? "Dropped pin"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {draft.place?.label ?? `${draft.lat.toFixed(4)}, ${draft.lng.toFixed(4)}`}
                    </p>
                  </>
                )}
              </div>
              <button
                type="button"
                className="primary-button button-sm"
                disabled={draft.loading}
                onClick={() => addStop({
                  name: draft.place?.name ?? `Pin ${draft.lat.toFixed(3)}, ${draft.lng.toFixed(3)}`,
                  address: draft.place?.label,
                  latitude: draft.place?.latitude ?? draft.lat,
                  longitude: draft.place?.longitude ?? draft.lng,
                })}
              >
                <Plus className="size-4" /> Add
              </button>
              <button type="button" className="icon-button icon-button-sm" aria-label="Dismiss" onClick={() => setDraft(null)}>
                <X className="size-4" />
              </button>
            </div>
          )}
        </div>

        {/* Stops */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {stops.length === 0 ? (
            <div className="empty-state py-10">
              <span className="empty-state-icon"><RouteIcon className="size-5" /></span>
              <p className="empty-state-title">Plan the journey</p>
              <p className="empty-state-text">
                Add where you start, where you&apos;ll stay and where you&apos;re meeting people. We&apos;ll draw the route and work out distances.
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={stops.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                <ol className="space-y-0.5">
                  {stops.map((stop, index) => (
                    <SortableStop
                      key={stop.key}
                      stop={stop}
                      index={index}
                      last={index === stops.length - 1}
                      leg={index < stops.length - 1 ? route?.legs[index] : undefined}
                      active={activeKey === stop.key}
                      expanded={expandedKey === stop.key}
                      canEdit={canEdit}
                      minDate={startDate?.slice(0, 10)}
                      maxDate={endDate?.slice(0, 10)}
                      onSelect={() => setActiveKey(stop.key)}
                      onToggle={() => setExpandedKey((k) => (k === stop.key ? null : stop.key))}
                      onChange={(patch) => updateStop(stop.key, patch)}
                      onRemove={() => removeStop(stop.key)}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Summary and actions */}
        <div className="space-y-3 border-t border-border p-4">
          {routeError && stops.length >= 2 && (
            <p className="flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {routeError}
            </p>
          )}
          {route && stops.length >= 2 && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Total by {ROUTE_PROFILES.find((p) => p.value === profile)?.label.toLowerCase()}</p>
                <p className="font-display text-xl font-semibold tabular-nums text-ink">
                  {formatDistance(route.distanceMeters)} <span className="text-muted-foreground">·</span> {formatDuration(route.durationSeconds)}
                </p>
              </div>
              {mileageSlot?.({ distanceMeters: route.distanceMeters, from: stops[0].name, to: stops[stops.length - 1].name, profile })}
            </div>
          )}
          {visibleRoutes.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Route options">
              {visibleRoutes.map((r, index) => (
                <button
                  key={index}
                  type="button"
                  role="radio"
                  aria-checked={selectedRoute === index}
                  onClick={() => setSelectedRoute(index)}
                  className="chip chip-button"
                >
                  {index === 0 ? "Fastest" : `Option ${String.fromCharCode(65 + index)}`} · {formatDistance(r.distanceMeters)} · {formatDuration(r.durationSeconds)}
                </button>
              ))}
            </div>
          )}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              {routingEnabled && stops.length >= 4 && (
                <button type="button" className="secondary-button button-sm" onClick={optimize} disabled={optimizing}>
                  {optimizing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Optimise order
                </button>
              )}
              {dirty && (
                <button type="button" className="ghost-button button-sm" onClick={reset} disabled={saving}>
                  <RotateCcw className="size-4" /> Discard
                </button>
              )}
              <button type="button" className="primary-button button-sm ml-auto" onClick={save} disabled={!dirty || saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? "Saving…" : "Save itinerary"}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── Place search ───────────────────────────────────────────────────────── */
function PlaceSearch({ near, onPick }: { near?: { lat: number; lon: number }; onPick: (place: PlaceDto) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const nearRef = useRef(near);
  useEffect(() => {
    nearRef.current = near;
  }, [near]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const places = await plannerApi.search(q, nearRef.current);
        setResults(places);
        setActive(0);
        setError(null);
      } catch (e) {
        setResults([]);
        setError(e instanceof Error ? e.message : "Search failed.");
      } finally {
        setLoading(false);
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [query]);

  function pick(place: PlaceDto) {
    onPick(place);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
          if (e.key === "Enter" && results[active]) { e.preventDefault(); pick(results[active]); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Add a stop — city, address or venue"
        className="form-control pl-9 pr-9"
        aria-label="Search for a place"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="place-results"
        aria-autocomplete="list"
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-subtle" />}
      {open && query.trim().length >= 2 && !loading && (results.length > 0 || error) && (
        <ul id="place-results" role="listbox" className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lift">
          {error && <li className="px-3 py-3 text-sm text-destructive">{error}</li>}
          {results.map((place, index) => (
            <li key={place.id} role="option" aria-selected={active === index}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(place)}
                onMouseEnter={() => setActive(index)}
                className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left", active === index && "bg-muted")}
              >
                <span className="icon-tile size-8"><MapPin className="size-4" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{place.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{place.label}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim().length >= 2 && !loading && results.length === 0 && !error && (
        <p className="absolute inset-x-0 top-[calc(100%+6px)] z-30 rounded-xl border border-border bg-popover px-3 py-3 text-sm text-muted-foreground shadow-lift">
          No places match “{query}”. Try a city or street name, or click the map.
        </p>
      )}
    </div>
  );
}

/* ── Stop row ───────────────────────────────────────────────────────────── */
function SortableStop({
  stop, index, last, leg, active, expanded, canEdit, minDate, maxDate, onSelect, onToggle, onChange, onRemove,
}: {
  stop: DraftStop;
  index: number;
  last: boolean;
  leg?: { distanceMeters: number; durationSeconds: number };
  active: boolean;
  expanded: boolean;
  canEdit: boolean;
  minDate?: string;
  maxDate?: string;
  onSelect: () => void;
  onToggle: () => void;
  onChange: (patch: Partial<DraftStop>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.key, disabled: !canEdit });
  const kindLabel = STOP_KINDS.find((k) => k.value === stop.kind)?.label ?? "Stop";
  const dates = [stop.arriveOn, stop.departOn].filter(Boolean);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-20")}
    >
      <div
        className={cn(
          "group flex items-start gap-2 rounded-xl px-2 py-2 transition-colors",
          active ? "bg-accent/70" : "hover:bg-muted/70",
          isDragging && "bg-card shadow-lift"
        )}
        onClick={onSelect}
      >
        {canEdit ? (
          <button
            type="button"
            className="mt-1 flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded text-subtle hover:text-foreground active:cursor-grabbing"
            aria-label={`Reorder ${stop.name}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : <span className="w-1" />}
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums text-white",
            stop.kind === "stay" ? "bg-[oklch(0.6_0.16_176)]" : stop.kind === "meeting" ? "bg-[oklch(0.66_0.17_50)]" : "bg-primary"
          )}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{stop.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {stop.kind !== "stop" && <span className="font-medium text-foreground/80">{kindLabel} · </span>}
            {dates.length > 0 ? dates.join(" → ") : stop.address ?? `${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="icon-button icon-button-sm"
          aria-label={expanded ? "Hide details" : "Edit details"}
          aria-expanded={expanded}
        >
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {expanded && (
        <div className="mx-2 mb-2 grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-2" onClick={(e) => e.stopPropagation()}>
          <label className="field sm:col-span-2">
            Name
            <input className="form-control" value={stop.name} disabled={!canEdit} onChange={(e) => onChange({ name: e.target.value })} maxLength={200} />
          </label>
          <label className="field">
            Type
            <select className="form-control" value={stop.kind} disabled={!canEdit} onChange={(e) => onChange({ kind: e.target.value as StopKind })}>
              {STOP_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </label>
          <div className="hidden sm:block" />
          <label className="field">
            Arrive
            <input type="date" className="form-control" value={stop.arriveOn ?? ""} min={minDate} max={maxDate} disabled={!canEdit}
              onChange={(e) => onChange({ arriveOn: e.target.value || undefined })} />
          </label>
          <label className="field">
            Leave
            <input type="date" className="form-control" value={stop.departOn ?? ""} min={stop.arriveOn ?? minDate} max={maxDate} disabled={!canEdit}
              onChange={(e) => onChange({ departOn: e.target.value || undefined })} />
          </label>
          <label className="field sm:col-span-2">
            Notes
            <textarea className="form-control min-h-16" value={stop.notes ?? ""} disabled={!canEdit} maxLength={1000}
              placeholder="Hotel booking ref, who you're meeting, parking…" onChange={(e) => onChange({ notes: e.target.value || undefined })} />
          </label>
          {canEdit && (
            <div className="flex justify-end sm:col-span-2">
              <button type="button" className="danger-button button-sm" onClick={onRemove}>
                <Trash2 className="size-4" /> Remove stop
              </button>
            </div>
          )}
        </div>
      )}

      {!last && (
        <div className="flex items-center gap-2 py-0.5 pl-[2.6rem] text-[0.6875rem] text-muted-foreground">
          <span className="ml-[0.8rem] h-5 border-l-2 border-dashed border-border-strong" />
          {leg ? (
            <span className="tabular-nums">{formatDistance(leg.distanceMeters)} · {formatDuration(leg.durationSeconds)}</span>
          ) : null}
        </div>
      )}
    </li>
  );
}
