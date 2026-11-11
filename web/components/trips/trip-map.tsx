"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { MapPinOff } from "lucide-react";
import type { Map as MapLibreMap, Marker, MapMouseEvent, StyleSpecification } from "maplibre-gl";
import { MAP_STYLE_DARK, MAP_STYLE_LIGHT } from "@/lib/trips";
import { cn } from "@/lib/utils";

export type MapStop = { id: string; name: string; latitude: number; longitude: number; kind?: string };
export type MapRoute = { coordinates: [number, number][] };

const ROUTE_COLORS = {
  light: { route: "#3d4fe0", alt: "#94a3b8", casing: "#ffffff" },
  dark: { route: "#8b9bff", alt: "#64748b", casing: "#0f1424" },
};

/** Used when the tile server can't be reached: stops and routes still draw on a plain canvas. */
const FALLBACK_STYLE = (dark: boolean): StyleSpecification => ({
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": dark ? "#151a2b" : "#eef1f6" } }],
});

/**
 * Interactive trip map: numbered stop pins, the selected route and its alternatives.
 * MapLibre is loaded on the client only; the map keeps working when tiles fail to load.
 */
export function TripMap({
  stops,
  routes = [],
  selectedRoute = 0,
  activeStopId,
  draftPoint,
  onMapClick,
  onStopClick,
  onRouteClick,
  className,
  interactive = true,
}: {
  stops: MapStop[];
  routes?: MapRoute[];
  selectedRoute?: number;
  activeStopId?: string | null;
  draftPoint?: [number, number] | null;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onStopClick?: (id: string) => void;
  onRouteClick?: (index: number) => void;
  className?: string;
  interactive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const draftRef = useRef<Marker | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const handlersRef = useRef({ onMapClick, onStopClick, onRouteClick });
  const styleStateRef = useRef({ loaded: false, failed: false });
  const [ready, setReady] = useState(false);
  // Bumped after every style (re)load, because setStyle drops our route layers.
  const [styleVersion, setStyleVersion] = useState(0);
  const [tilesFailed, setTilesFailed] = useState(false);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const colors = dark ? ROUTE_COLORS.dark : ROUTE_COLORS.light;

  useEffect(() => {
    handlersRef.current = { onMapClick, onStopClick, onRouteClick };
  }, [onMapClick, onStopClick, onRouteClick]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    (async () => {
      // maplibre-gl v5 ships a UMD bundle; depending on the bundler the API sits on `default`.
      const mod = await import("maplibre-gl");
      const lib = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
      if (cancelled || !containerRef.current) return;
      libRef.current = lib;
      map = new lib.Map({
        container: containerRef.current,
        style: dark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT,
        center: [10, 50],
        zoom: 3.2,
        attributionControl: { compact: true, customAttribution: "Routing © openrouteservice.org" },
        interactive,
        cooperativeGestures: false,
      });
      if (interactive) map.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      // If the style document can't be fetched (offline, blocked tile host), switch once to a
      // plain canvas so stops and routes still render.
      styleStateRef.current = { loaded: false, failed: false };
      map.on("error", () => {
        const state = styleStateRef.current;
        if (state.loaded || state.failed) return;
        state.failed = true;
        setTilesFailed(true);
        map?.setStyle(FALLBACK_STYLE(dark));
      });
      map.on("style.load", () => {
        if (cancelled || !map) return;
        styleStateRef.current.loaded = true;
        ensureRouteLayers(map);
        setReady(true);
        setStyleVersion((v) => v + 1);
      });
      map.on("click", (event: MapMouseEvent) => {
        const features = map?.queryRenderedFeatures(event.point, { layers: ["route-alt-line"].filter((id) => map?.getLayer(id)) }) ?? [];
        const alt = features[0]?.properties?.index;
        if (alt !== undefined && handlersRef.current.onRouteClick) {
          handlersRef.current.onRouteClick(Number(alt));
          return;
        }
        handlersRef.current.onMapClick?.({ lng: event.lngLat.lng, lat: event.lngLat.lat });
      });
      map.on("mouseenter", "route-alt-line", () => { if (map) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "route-alt-line", () => { if (map) map.getCanvas().style.cursor = ""; });
    })();
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      draftRef.current?.remove();
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the app theme.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    styleStateRef.current = { loaded: false, failed: tilesFailed };
    map.setStyle(tilesFailed ? FALLBACK_STYLE(dark) : dark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  // Draw routes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const draw = () => {
      ensureRouteLayers(map);
      const main = routes[selectedRoute];
      const alts = routes.map((r, index) => ({ r, index })).filter(({ index }) => index !== selectedRoute);
      (map.getSource("route-main") as { setData?: (d: unknown) => void } | undefined)?.setData?.({
        type: "FeatureCollection",
        features: main ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: main.coordinates } }] : [],
      });
      (map.getSource("route-alt") as { setData?: (d: unknown) => void } | undefined)?.setData?.({
        type: "FeatureCollection",
        features: alts.map(({ r, index }) => ({ type: "Feature", properties: { index }, geometry: { type: "LineString", coordinates: r.coordinates } })),
      });
      map.setPaintProperty("route-main-casing", "line-color", colors.casing);
      map.setPaintProperty("route-main-line", "line-color", colors.route);
      map.setPaintProperty("route-alt-line", "line-color", colors.alt);
    };
    if (map.isStyleLoaded() || map.getSource("route-main")) draw();
  }, [routes, selectedRoute, ready, styleVersion, colors.alt, colors.casing, colors.route]);

  // Draw stop pins.
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = stops.map((stop, index) => {
      // MapLibre owns the marker element's transform, so the rotated teardrop lives inside it.
      const el = document.createElement("button");
      el.type = "button";
      el.className = "map-marker";
      el.setAttribute("aria-label", `Stop ${index + 1}: ${stop.name}`);
      el.title = stop.name;
      const pin = document.createElement("span");
      pin.className = "map-pin";
      pin.dataset.kind = stop.kind ?? "stop";
      pin.dataset.active = String(stop.id === activeStopId);
      const label = document.createElement("span");
      label.textContent = String(index + 1);
      pin.appendChild(label);
      el.appendChild(pin);
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        handlersRef.current.onStopClick?.(stop.id);
      });
      return new lib.Marker({ element: el, anchor: "bottom" })
        .setLngLat([stop.longitude, stop.latitude])
        .addTo(map);
    });
  }, [stops, activeStopId, ready]);

  // Draft point (a place being previewed before it is added).
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || !ready) return;
    draftRef.current?.remove();
    draftRef.current = null;
    if (draftPoint) {
      const el = document.createElement("div");
      el.className = "map-pin-draft";
      draftRef.current = new lib.Marker({ element: el }).setLngLat(draftPoint).addTo(map);
    }
  }, [draftPoint, ready]);

  // Frame the stops and route.
  const frameKey = JSON.stringify([stops.map((s) => [s.longitude, s.latitude]), routes[selectedRoute]?.coordinates.length ?? 0]);
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || !ready) return;
    const points: [number, number][] = [
      ...stops.map((s) => [s.longitude, s.latitude] as [number, number]),
      ...(routes[selectedRoute]?.coordinates ?? []),
    ];
    if (points.length === 0) return;
    if (points.length === 1) {
      map.easeTo({ center: points[0], zoom: Math.max(map.getZoom(), 10), duration: 600 });
      return;
    }
    const bounds = points.reduce((b, p) => b.extend(p), new lib.LngLatBounds(points[0], points[0]));
    map.fitBounds(bounds, { padding: { top: 80, bottom: 56, left: 56, right: 64 }, maxZoom: 13, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameKey, ready]);

  return (
    <div className={cn("map-frame", className)}>
      {/* Inline position: maplibre-gl.css (unlayered) would override utility classes here. */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {tilesFailed && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-5rem)] items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-soft">
          <MapPinOff className="size-3.5 shrink-0" />
          Map tiles are unavailable right now. Stops and routes are still shown.
        </div>
      )}
    </div>
  );
}

function ensureRouteLayers(map: MapLibreMap) {
  const empty = { type: "FeatureCollection" as const, features: [] };
  if (!map.getSource("route-alt")) map.addSource("route-alt", { type: "geojson", data: empty });
  if (!map.getSource("route-main")) map.addSource("route-main", { type: "geojson", data: empty });
  if (!map.getLayer("route-alt-line")) {
    map.addLayer({
      id: "route-alt-line",
      type: "line",
      source: "route-alt",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#94a3b8", "line-width": 5, "line-opacity": 0.85, "line-dasharray": [1.4, 1.2] },
    });
  }
  if (!map.getLayer("route-main-casing")) {
    map.addLayer({
      id: "route-main-casing",
      type: "line",
      source: "route-main",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": 9 },
    });
  }
  if (!map.getLayer("route-main-line")) {
    map.addLayer({
      id: "route-main-line",
      type: "line",
      source: "route-main",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#3d4fe0", "line-width": 5 },
    });
  }
}
