import { useCallback, useEffect, useRef } from "react";
import { useTrip, type Snap, type Tab } from "../store";
import Days from "./Days";
import Universal from "./Universal";
import Tips from "./Tips";

/** Three heights: a peek, half, and most of the screen.  The handle is dragged frame
 *  by frame and settles on the nearest one; a tap cycles them.  The height is written
 *  to --sheet-h on <html> because the legend is positioned off the same variable and
 *  has to move with it. */
const SNAPS = [0.17, 0.44, 0.86];
const TABS: [Tab, string][] = [["days", "Days"], ["uni", "Universal"], ["tips", "Tips"]];

export default function Sheet() {
  const { tab, setTab, snap, setSnap } = useTrip();
  const el = useRef<HTMLElement | null>(null);
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null);

  const setHeight = useCallback((px: number) => {
    document.documentElement.style.setProperty("--sheet-h", `${Math.round(px)}px`);
  }, []);

  // Desktop turns the sheet into a side panel, where a height would mean nothing.
  const wide = () => window.innerWidth >= 900;

  useEffect(() => {
    const apply = () => setHeight(wide() ? 0 : SNAPS[snap] * window.innerHeight);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [snap, setHeight]);

  const onDown = (e: React.PointerEvent) => {
    if (wide()) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, h: el.current!.getBoundingClientRect().height, moved: false };
    el.current!.classList.add("dragging");
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (Math.abs(dy) > 4) d.moved = true;
    setHeight(Math.max(60, Math.min(window.innerHeight * 0.92, d.h + dy)));
  };
  const onUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    el.current!.classList.remove("dragging");
    const h = el.current!.getBoundingClientRect().height / window.innerHeight;
    if (!d.moved) {
      setSnap(((snap + 1) % SNAPS.length) as Snap);
      return;
    }
    let best: Snap = 0;
    SNAPS.forEach((s, i) => {
      if (Math.abs(s - h) < Math.abs(SNAPS[best] - h)) best = i as Snap;
    });
    setSnap(best);
  };

  return (
    <section className={`sheet${snap === 0 ? " small" : ""}`} ref={el}>
      <button
        className="grab" aria-label="Resize panel"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      ><i /></button>
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id} className="tab" role="tab" aria-selected={tab === id}
            onClick={() => { setTab(id); if (snap === 0) setSnap(1); }}
          >{label}</button>
        ))}
      </div>
      <div className="body" id="body">
        {tab === "days" ? <Days /> : tab === "uni" ? <Universal /> : <Tips />}
      </div>
    </section>
  );
}
