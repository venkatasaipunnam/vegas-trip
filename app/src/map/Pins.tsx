import { Marker } from "react-map-gl/maplibre";
import { CITYCOL, dayById, places, stopsOf } from "../data";
import { useTrip } from "../store";
import { ICONS, PLACEICONS } from "./pinIcons";

const tint = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const colourOf = (cat: string, v: string) =>
  cat === "stay" ? "#c9b6ff"
    : cat === "extra" ? "#a89cc8"
      : v === "la" ? CITYCOL.la
        : v === "trip" ? CITYCOL.az
          : CITYCOL.lv;

/** One pin per place.  The scaling lives on its own layer between MapLibre's
 *  transform and the pin itself: the pin's tip sits on the wrapper's centre, so
 *  scaling about 50%/50% keeps the tip on its coordinate at every zoom. */
export default function Pins({ onPick }: { onPick: (id: string) => void }) {
  const { day, showAll, activeId } = useTrip();
  const stops = stopsOf(dayById(day));

  return (
    <>
      {Object.entries(places).map(([id, p]) => {
        const i = stops.indexOf(id);
        // Off-day places are clutter on a phone — 26 anonymous dots against two real
        // stops — so they wait for "All stops".
        if (i < 0 && !showAll) return null;
        const col = colourOf(p.cat, p.v);
        return (
          <Marker key={id} longitude={p.lng} latitude={p.lat} anchor="center">
            <div
              className={`mkwrap${i < 0 ? " dim" : ""}`}
              title={p.n}
              aria-label={`${i >= 0 ? `${i + 1}. ` : ""}${p.n}`}
              onClick={(e) => { e.stopPropagation(); onPick(id); }}
            >
              <div className="mkscale">
                <div
                  className={`mk${i < 0 ? " dim" : ""}${id === activeId ? " active" : ""}`}
                  style={{ ["--c" as string]: col, ["--cbg" as string]: tint(col, 0.74) }}
                  dangerouslySetInnerHTML={{ __html: PLACEICONS[id] || ICONS[p.cat] || ICONS.see }}
                />
              </div>
            </div>
          </Marker>
        );
      })}
    </>
  );
}
