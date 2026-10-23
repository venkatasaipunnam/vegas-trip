import { useMemo } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { dayById, legRec, places, stopsOf } from "../data";
import { useTrip } from "../store";
import { legModeOf } from "../lib/legs";
import { useRoadJourney, type JourneyLeg } from "./useRoadJourney";

/** The built-in itinerary's play-through: work out its legs, then hand them to the
 *  shared journey so it plays exactly like a plan Sai built himself. */
export function useJourney(ref: React.MutableRefObject<MapRef | null>, ready: boolean) {
  const { day, modePick, flying } = useTrip();

  const legs = useMemo<JourneyLeg[]>(() => {
    const stops = stopsOf(dayById(day));
    const out: JourneyLeg[] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const mode = legModeOf(day, i, modePick);
      const rec = legRec(day, i);
      const a = places[stops[i]], b = places[stops[i + 1]];
      const geom = rec?.modes[mode]?.geom as [number, number][] | undefined;
      out.push({
        mode,
        coords: geom?.length ? geom : [[a.lng, a.lat], [b.lng, b.lat]],
      });
    }
    return out;
  }, [day, modePick]);

  useRoadJourney({
    ref,
    ready,
    playing: flying,
    legs,
    startAt: useTrip.getState().progress[day] ?? 0,
    pitch: useTrip.getState().is3d ? 64 : 0,
    onArrive: (i) => {
      useTrip.getState().setAt(i);
      useTrip.getState().setTraveling(true);
    },
    onStop: () => {
      useTrip.getState().setFlying(false);
      useTrip.getState().setTraveling(false);
    },
  });
}
