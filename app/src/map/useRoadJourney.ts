import { useEffect } from "react";
import maplibregl from "maplibre-gl";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { MapRef } from "react-map-gl/maplibre";
import { Figure } from "../ui/Icons";

/** Playing a day back as a journey, for any plan.
 *
 *  Playing used to be a slideshow: the camera jumped to each stop in turn and the figure
 *  appeared at the end of each jump.  This walks him along the actual road — the same
 *  geometry the line is drawn from — with the camera travelling behind him.
 *
 *  It takes the legs rather than reading a particular trip, so the built-in itinerary and
 *  a plan Sai built himself play back the same way. */

export interface JourneyLeg {
  coords: [number, number][];
  mode: string;
}

const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};

function bearingBetween(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180;
  const dl = (b[0] - a[0]) * r;
  const y = Math.sin(dl) * Math.cos(b[1] * r);
  const x = Math.cos(a[1] * r) * Math.sin(b[1] * r) -
    Math.sin(a[1] * r) * Math.cos(b[1] * r) * Math.cos(dl);
  return (Math.atan2(y, x) / r + 360) % 360;
}

function metres(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180;
  const dla = (b[1] - a[1]) * r;
  const dlo = (b[0] - a[0]) * r;
  const h = Math.sin(dla / 2) ** 2 +
    Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dlo / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Distance along the line for every vertex, so a fraction of the journey maps to a
 *  real point on the road rather than to the nth vertex (vertices bunch up on bends). */
function measure(coords: [number, number][]) {
  const acc = [0];
  for (let i = 1; i < coords.length; i++) acc.push(acc[i - 1] + metres(coords[i - 1], coords[i]));
  return acc;
}

function pointAt(coords: [number, number][], acc: number[], dist: number): [number, number] {
  const total = acc[acc.length - 1];
  const d = Math.max(0, Math.min(dist, total));
  let i = 1;
  while (i < acc.length - 1 && acc[i] < d) i++;
  const seg = acc[i] - acc[i - 1] || 1;
  const t = (d - acc[i - 1]) / seg;
  const a = coords[i - 1], b = coords[i];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Long legs are not played at their true length: the coach to the Grand Canyon is
 *  250 km and nobody watches that for two minutes. */
const legSeconds = (km: number) => Math.max(5, Math.min(13, 4 + km * 0.9));
/** Pulled back for the desert, in among the buildings on the Strip. */
const travelZoom = (km: number) => (km > 60 ? 8.6 : km > 12 ? 11.4 : km > 3 ? 13.6 : 15.6);


export function useRoadJourney({
  ref, ready, playing, legs, startAt = 0, pitch = 64, onArrive, onStop,
}: {
  ref: React.MutableRefObject<MapRef | null>;
  ready: boolean;
  playing: boolean;
  legs: JourneyLeg[];
  /** Which leg to set off from — where he already is in the day. */
  startAt?: number;
  pitch?: number;
  /** Called as he reaches each stop, so the page can follow along. */
  onArrive?: (stopIndex: number) => void;
  /** Called exactly once when playback ends for any reason — finished, cancelled by a
   *  drag, or the page moved on.  One callback rather than two, because every one of
   *  those leaves the page in the same state: not playing. */
  onStop?: () => void;
}) {
  useEffect(() => {
    const m = ref.current?.getMap();
    if (!playing || !ready || !m || !legs.length) return;

    let cancelled = false;
    let stopped = false;
    let raf = 0;
    const finish = () => {
      if (stopped) return;
      stopped = true;
      onStop?.();
    };
    // Any drag is him taking the map back, so playback gets out of the way.
    const stop = () => { cancelled = true; finish(); };
    m.once("dragstart", stop);

    // The travelling figure is a plain MapLibre marker moved by hand, not a React
    // marker: at 60 frames a second a component per frame is what makes a phone stutter.
    const host = document.createElement("div");
    host.className = "mewrap travelling";
    const inner = document.createElement("div");
    inner.className = "mescale";
    host.appendChild(inner);
    const root: Root = createRoot(inner);
    root.render(createElement("div", { className: "me" }, createElement(Figure)));
    const marker = new maplibregl.Marker({ element: host, anchor: "bottom" })
      .setLngLat(legs[Math.min(startAt, legs.length - 1)].coords[0])
      .addTo(m);

    (async () => {
      for (let i = Math.min(startAt, legs.length - 1); i < legs.length; i++) {
        if (cancelled) break;
        const { coords, mode } = legs[i];
        if (coords.length < 2) continue;
        const acc = measure(coords);
        const km = acc[acc.length - 1] / 1000;
        const ms = legSeconds(km) * 1000;
        host.classList.toggle("walking", mode === "walk");
        onArrive?.(i);

        await new Promise<void>((done) => {
          const t0 = performance.now();
          let bearing = m.getBearing();
          const frame = (now: number) => {
            if (cancelled) return done();
            const t = Math.min(1, (now - t0) / ms);
            // Ease in and out so each leg starts and finishes like a vehicle does.
            const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
            const total = acc[acc.length - 1];
            const here = pointAt(coords, acc, e * total);
            const ahead = pointAt(coords, acc, Math.min(total, e * total + 25));
            marker.setLngLat(here);
            // Smoothed, because a winding road would otherwise spin the camera.
            bearing = lerpAngle(bearing, bearingBetween(here, ahead), 0.07);
            m.jumpTo({ center: here, bearing, zoom: travelZoom(km), pitch });
            if (t >= 1) return done();
            raf = requestAnimationFrame(frame);
          };
          raf = requestAnimationFrame(frame);
        });

        if (!cancelled) onArrive?.(i + 1);
      }
      finish();
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      m.off("dragstart", stop);
      marker.remove();
      // Unmounting a root inside its own commit throws; next tick is safe.
      setTimeout(() => root.unmount(), 0);
      // Deliberately not onStop(): this cleanup also runs when the legs change — which
      // for a plan happens mid-journey, as each leg's road arrives from the router — and
      // telling the page it had stopped would end the playback it is about to resume.
    };
  }, [playing, ready, legs]);   // eslint-disable-line react-hooks/exhaustive-deps
}
