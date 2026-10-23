/** The shapes of src/data.json, src/routes.json and src/transit.json.
 *  These are hand-edited files, so the types are the only thing standing between a
 *  typo in the trip plan and a blank screen in the Nevada desert. */

export type City = "lv" | "la" | "az";
export type Side = "lv" | "la" | "trip";
export type ModeKey = "walk" | "transit" | "cab";

export interface Place {
  n: string;
  v: Side;
  lat: number;
  lng: number;
  cat: string;
  lp: string;
  dy?: string;
  see: string[];
  how: string;
  tip: string;
  q: string;
  /** Aggregate city pins jump to a day instead of being a stop. */
  goto?: string;
  /** Where a route begins and ends: the door, the bus bay, the kerb. */
  ent?: [number, number];
  entwhy?: string;
  /** OpenStreetMap id the coordinate came from (src/verifycoords.py re-checks it). */
  src?: string;
  gq?: string;
}

/** [time, place id, what he does, how he gets there, is a cab?, must book?] */
export type Step = [string, string, string, string, (0 | 1)?, (0 | 1)?];

export interface Day {
  id: string;
  short: string;
  title: string;
  city: City;
  win: string;
  bars: [number, number, string][];
  block: unknown[];
  steps: Step[];
}

export interface ModeRec {
  geom: [number, number][];
  km: number;
  min: number;
  steps: [string, number][];
  fare?: string;
  line?: string;
  stations?: [string, string][];
}

export interface LegRec {
  from: string;
  to: string;
  planned: ModeKey;
  modes: Partial<Record<ModeKey, ModeRec>>;
}

export interface RouteData {
  legs: Record<string, LegRec>;
  extra: Record<string, ModeRec>;
}

export interface TripData {
  P: Record<string, Place>;
  DAYS: Day[];
  CATS: Record<string, string>;
  RIDES: [string, string, string][];
  LACARDS: [string, string, string][];
  AZCARDS: [string, string, string][];
}

/** A leg of the current day, resolved: who is at each end and how he covers it. */
export interface Leg {
  i: number;
  from: Place;
  to: Place;
  fromId: string;
  toId: string;
  /** The step text that introduced the destination. */
  how: string;
  mode: ModeKey;
  planned: ModeKey;
  rec: LegRec | null;
  data: ModeRec | null;
}
