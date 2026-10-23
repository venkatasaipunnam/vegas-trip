import { create } from "zustand";
import { DAYS, dayById, legRec, stopsOf } from "./data";
import type { ModeKey } from "./types";

/** Both keys are the ones the single-file page used, so a phone that already has
 *  his place in the day — or a mode he picked — carries it into this version. */
const PROGKEY = "np-progress";
const MODEKEY = "np-mode";

function read<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) || "null") as T) ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private browsing, full disk: the app still has to work */
  }
}

export type Tab = "days" | "uni" | "tips";
export type Snap = 0 | 1 | 2;

interface TripState {
  tab: Tab;
  day: string;
  /** How far through each day he is, by day id. */
  progress: Record<string, number>;
  modePick: Record<string, ModeKey>;
  is3d: boolean;
  sat: boolean;
  showAll: boolean;
  legend: boolean;
  activeId: string | null;
  flying: boolean;
  snap: Snap;
  /** The stop the camera should fly to.  The counter is what makes tapping the same
   *  stop twice fly there twice. */
  focus: { id: string | null; nonce: number };

  setTab: (t: Tab) => void;
  selectDay: (id: string) => void;
  setAt: (i: number) => void;
  step: (delta: number) => void;
  setMode: (day: string, i: number, m: ModeKey) => void;
  setActive: (id: string | null) => void;
  flyTo: (id: string) => void;
  setFlying: (v: boolean) => void;
  setSnap: (s: Snap) => void;
  toggle: (k: "is3d" | "sat" | "showAll" | "legend") => void;
}

export const useTrip = create<TripState>((set, get) => ({
  tab: "days",
  day: DAYS[0].id,
  progress: read<Record<string, number>>(PROGKEY, {}),
  modePick: read<Record<string, ModeKey>>(MODEKEY, {}),
  is3d: true,
  sat: false,
  showAll: false,
  legend: false,
  activeId: null,
  flying: false,
  snap: 1,
  focus: { id: null, nonce: 0 },

  setTab: (tab) => set({ tab }),
  selectDay: (day) => set({ day, activeId: null, flying: false }),
  setAt: (i) => {
    const { day, progress } = get();
    const last = Math.max(0, stopsOf(dayById(day)).length - 1);
    const at = Math.max(0, Math.min(i, last));
    const next = { ...progress, [day]: at };
    write(PROGKEY, next);
    set({ progress: next });
  },
  step: (delta) => get().setAt(atOf(get().progress, get().day) + delta),
  setMode: (day, i, m) => {
    const next = { ...get().modePick, [`${day}:${i}`]: m };
    write(MODEKEY, next);
    set({ modePick: next });
  },
  setActive: (activeId) => set({ activeId }),
  flyTo: (id) => set((s) => ({ focus: { id, nonce: s.focus.nonce + 1 }, activeId: id })),
  setFlying: (flying) => set({ flying }),
  setSnap: (snap) => set({ snap }),
  toggle: (k) => set({ [k]: !get()[k] } as Pick<TripState, typeof k>),
}));

/** Clamped, because a day's stop list can change under a saved index. */
export function atOf(progress: Record<string, number>, day: string) {
  const last = Math.max(0, stopsOf(dayById(day)).length - 1);
  return Math.max(0, Math.min(progress[day] ?? 0, last));
}

export const useAtIdx = () => useTrip((s) => atOf(s.progress, s.day));

/** Which way he covers a leg: his own choice, else what the plan assumed, else a
 *  guess from the step text. */
export function useLegMode(day: string, i: number): ModeKey {
  return useTrip((s) => {
    const rec = legRec(day, i);
    const pick = s.modePick[`${day}:${i}`];
    if (pick && (!rec || rec.modes[pick])) return pick;
    return rec ? rec.planned : "walk";
  });
}
