import tripJson from "@trip/data.json";
import routeJson from "@trip/routes.json";
import type { Day, LegRec, ModeRec, Place, RouteData, TripData } from "./types";

const trip = tripJson as unknown as TripData;
const routes = routeJson as unknown as RouteData;

export const P: Record<string, Place> = trip.P;
export const DAYS: Day[] = trip.DAYS;
export const CATS = trip.CATS;
export const RIDES = trip.RIDES;
export const LACARDS = trip.LACARDS;
export const AZCARDS = trip.AZCARDS;

/** Real stops only: the aggregate city pins are shortcuts to a day, not places he goes. */
export const places: Record<string, Place> = Object.fromEntries(
  Object.entries(P).filter(([, p]) => !p.goto),
);

export const CITYCOL: Record<string, string> = {
  lv: "#ff4fa3",
  la: "#3fe0e8",
  az: "#ffb547",
};
export const ZOOM: Record<string, number> = { lv: 16.6, la: 15.6, trip: 14.2 };

export const dayById = (id: string): Day =>
  DAYS.find((d) => d.id === id) ?? DAYS[0];

/** The day's stops, with the step text that introduced each one.  Consecutive steps
 *  at the same place are one stop: he does not travel from the Venetian to itself. */
export function legsOf(d: Day): { id: string; how: string; cab: boolean }[] {
  const out: { id: string; how: string; cab: boolean }[] = [];
  for (const s of d.steps) {
    const id = s[1];
    if (id && places[id] && (!out.length || out[out.length - 1].id !== id)) {
      out.push({ id, how: s[3] || "", cab: !!s[4] });
    }
  }
  return out;
}
export const stopsOf = (d: Day): string[] => legsOf(d).map((l) => l.id);

export const legKey = (day: string, i: number) => `${day}:${i}`;
export const legRec = (day: string, i: number): LegRec | null =>
  routes.legs[legKey(day, i)] ?? null;
/** The overnight coach to LA: the one journey that is not a leg between two stops. */
export const extraOf = (day: string): ModeRec | null => routes.extra[day] ?? null;
