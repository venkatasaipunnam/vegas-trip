import { useEffect, useRef, useState } from "react";
import { geocode, tripHits, type Hit, type LatLng } from "../lib/search";
import type { Point } from "../lib/route";

/** One end of a journey.  Typing searches the trip's own stops first — they answer
 *  instantly and work with no signal — and then anywhere else through Photon. */
export default function PlaceField({
  label, icon, value, onPick, near, onUseLocation, locating, mine,
}: {
  label: string;
  icon: string;
  value: Point | null;
  onPick: (h: Hit | null) => void;
  near: LatLng | null;
  onUseLocation?: () => void;
  locating?: boolean;
  /** Whether this profile owns the built-in trip, and so should be offered its stops. */
  mine?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const box = useRef<HTMLDivElement | null>(null);

  // Local matches show as you type; the geocoder is given a moment so a four-letter
  // search is one request rather than four.
  useEffect(() => {
    const local = tripHits(q, 5, mine);
    setHits(local);
    if (q.trim().length < 3) return;
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const far = await geocode(q, near, ac.signal);
        setHits([...local, ...far.filter((f) => !local.some((l) => l.name === f.name))]);
      } catch {
        /* offline or the geocoder is down: the trip's own stops still answer */
      }
    }, 350);
    return () => { clearTimeout(t); ac.abort(); };
  }, [q, near, mine]);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  const pick = (h: Hit) => {
    onPick(h);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="field" ref={box}>
      <span className="fi" aria-hidden="true">{icon}</span>
      <div className="fin">
        <label>{label}</label>
        {value && !open ? (
          <button className="chosen" onClick={() => setOpen(true)}>
            <b>{value.name}</b><i>change</i>
          </button>
        ) : (
          <input
            autoFocus={open}
            value={q}
            placeholder={locating ? "Finding you…" : "Search a place"}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
        )}
      </div>
      {value && <button className="clear" aria-label={`Clear ${label}`} onClick={() => { onPick(null); setQ(""); }}>×</button>}

      {open && (
        <div className="sugg">
          {onUseLocation && (
            <button className="s use" onClick={() => { onUseLocation(); setOpen(false); }}>
              ◉ <b>Use my current location</b>
            </button>
          )}
          {hits.map((h) => (
            <button className={`s${h.mine ? " mine" : ""}`} key={`${h.name}${h.lat}`} onClick={() => pick(h)}>
              <b>{h.name}</b><span>{h.sub}</span>
            </button>
          ))}
          {!hits.length && q.trim().length >= 3 && <p className="s none">Nothing found yet…</p>}
        </div>
      )}
    </div>
  );
}
