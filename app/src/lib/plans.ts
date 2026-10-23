/** Saved trip plans: many per person, each a named version he can come back to.
 *
 *  Stored per account in localStorage.  That is a real limit, and worth stating plainly:
 *  a plan lives on the device it was made on — it does not follow him from phone to
 *  laptop, and clearing site data removes it.  Swapping this file's four storage calls
 *  for Vercel KV behind serverless routes is what makes them sync. */
import { CAT_ICON, type IconKey } from "./icons";
import { DAYS, legsOf, places } from "../data";
import { seedAccount } from "./accounts";

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon: IconKey;
  /** Free text, because "9:00 PM" and "after work" are both useful. */
  time?: string;
  note?: string;
  /** How he gets to this stop from the one before it. */
  mode?: "walk" | "transit" | "cab";
}

export interface PlanDay {
  id: string;
  title: string;
  date?: string;
  stops: Stop[];
}

export interface Plan {
  id: string;
  name: string;
  days: PlanDay[];
  created: string;
  updated: string;
}

const key = (user: string) => `np-plans:${user}`;
export const uid = () => Math.random().toString(36).slice(2, 10);

export function listPlans(user: string): Plan[] {
  try {
    const all = JSON.parse(localStorage.getItem(key(user)) || "[]") as Plan[];
    return all.sort((a, b) => b.updated.localeCompare(a.updated));
  } catch {
    return [];
  }
}

export function savePlan(user: string, plan: Plan) {
  const all = listPlans(user).filter((p) => p.id !== plan.id);
  all.push({ ...plan, updated: new Date().toISOString() });
  try {
    localStorage.setItem(key(user), JSON.stringify(all));
  } catch {
    /* out of quota or private browsing: nothing useful to do but keep running */
  }
}

export const getPlan = (user: string, id: string) =>
  listPlans(user).find((p) => p.id === id) ?? null;

export function deletePlan(user: string, id: string) {
  const all = listPlans(user).filter((p) => p.id !== id);
  try { localStorage.setItem(key(user), JSON.stringify(all)); } catch { /* ignore */ }
}

export function emptyPlan(name: string): Plan {
  const now = new Date().toISOString();
  return {
    id: uid(), name: name.trim() || "Untitled trip", created: now, updated: now,
    days: [{ id: uid(), title: "Day 1", stops: [] }],
  };
}

export function duplicatePlan(user: string, id: string) {
  const src = getPlan(user, id);
  if (!src) return null;
  const now = new Date().toISOString();
  const copy: Plan = {
    ...structuredClone(src), id: uid(), name: `${src.name} (copy)`, created: now, updated: now,
  };
  savePlan(user, copy);
  return copy;
}

/** The Vegas trip as an ordinary saved plan, so the owner's own account opens with the
 *  real thing in it rather than an empty list.  Built from the same src/data.json the
 *  /trip page reads, with each stop's category mapped onto a plan icon. */
export function vegasPlan(): Plan {
  const now = new Date().toISOString();
  return {
    id: "vegas-oct-2026",
    name: "Vegas & LA · Oct 24–31",
    created: now,
    updated: now,
    days: DAYS.map((d) => {
      const legs = legsOf(d);
      const seen = new Set<string>();
      return {
        id: `day-${d.id}`,
        title: `${d.short} — ${d.title}`,
        stops: d.steps
          .filter((s) => s[1] && places[s[1]])
          .map((s) => {
            const p = places[s[1]];
            const leg = legs.find((l) => l.id === s[1]);
            const first = !seen.has(s[1]);
            seen.add(s[1]);
            return {
              id: uid(),
              name: p.n,
              lat: p.lat,
              lng: p.lng,
              icon: CAT_ICON[p.cat] ?? "pin",
              time: s[0],
              note: s[2],
              mode: first && leg
                ? (leg.cab ? "cab" : /walk/i.test(leg.how) ? "walk" : "transit")
                : undefined,
            } as Stop;
          }),
      };
    }),
  };
}

/** The owner's own account, put in place on first run.  Only the PBKDF2 digest is here —
 *  the password itself is not in the code, and is not recoverable from this. */
const OWNER = {
  user: "vsai",
  salt: "1c739558b50caf773826b3edee1dea90",
  hash: "0e48deb20e947cc6405ea1fb82d5f0c478ba0016fb1a7ee1b6f5467ce87351d9",
  created: "2026-10-23T00:00:00.000Z",
};

export function seedOwner() {
  seedAccount(OWNER);
  // Only ever added once: if he edits or deletes it, it stays edited or deleted.
  const flag = `np-seeded:${OWNER.user}`;
  try {
    if (localStorage.getItem(flag)) return;
    savePlan(OWNER.user, vegasPlan());
    localStorage.setItem(flag, "1");
  } catch {
    /* private browsing: he can still sign in, there is just nothing stored */
  }
}
