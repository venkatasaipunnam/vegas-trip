import { dayById, legRec, legsOf, places, stopsOf } from "../data";
import type { Leg, ModeKey } from "../types";
import { modeFromStep } from "./geo";

/** Which way a leg is covered: his own choice, else what the plan assumed, else a
 *  guess from the step text.  Plain function (not a hook) so the map layers, the
 *  figure and the bar all answer the same question the same way. */
export function legModeOf(day: string, i: number, modePick: Record<string, ModeKey>): ModeKey {
  const rec = legRec(day, i);
  const pick = modePick[`${day}:${i}`];
  if (pick && (!rec || rec.modes[pick])) return pick;
  if (rec) return rec.planned;
  const D = dayById(day);
  const stops = stopsOf(D);
  const steps = legsOf(D);
  if (i + 1 >= stops.length) return "walk";
  return modeFromStep(steps[i + 1].how, steps[i + 1].cab, places[stops[i]], places[stops[i + 1]]);
}

/** Everything the next-leg bar needs about the leg ahead of him. */
export function legOf(day: string, i: number, modePick: Record<string, ModeKey>): Leg | null {
  const D = dayById(day);
  const stops = stopsOf(D);
  const steps = legsOf(D);
  if (i < 0 || i + 1 >= stops.length) return null;
  const mode = legModeOf(day, i, modePick);
  const rec = legRec(day, i);
  return {
    i,
    fromId: stops[i],
    toId: stops[i + 1],
    from: places[stops[i]],
    to: places[stops[i + 1]],
    how: steps[i + 1].how,
    mode,
    planned: rec ? rec.planned : mode,
    rec,
    data: rec?.modes[mode] ?? null,
  };
}
