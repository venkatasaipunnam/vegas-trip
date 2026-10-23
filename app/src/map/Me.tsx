import { Marker } from "react-map-gl/maplibre";
import { dayById, places, stopsOf } from "../data";
import { atOf, useTrip } from "../store";
import { legModeOf } from "../lib/legs";
import { Figure } from "../ui/Icons";

/** The green figure standing on the stop Sai is at right now.  anchor="bottom" puts
 *  his feet on the coordinate rather than his waist; the sideways nudge that keeps him
 *  out of the pin is a CSS transform scaled by --mks, so it shrinks with him instead of
 *  drifting as the map zooms. */
export default function Me() {
  const day = useTrip((s) => s.day);
  const atIdx = useTrip((s) => atOf(s.progress, s.day));
  const modePick = useTrip((s) => s.modePick);
  const stops = stopsOf(dayById(day));
  if (!stops.length) return null;

  const i = Math.min(atIdx, stops.length - 1);
  const p = places[stops[i]];
  // He strides when the leg ahead is a walk and stands and breathes otherwise.
  const walking = i < stops.length - 1 && legModeOf(day, i, modePick) === "walk";

  return (
    <Marker longitude={p.lng} latitude={p.lat} anchor="bottom">
      <div className={`mewrap${walking ? " walking" : ""}`} aria-label="You are here">
        <div className="menudge">
          <div className="mescale">
            <div className="mering" />
            <div className="me"><Figure /></div>
          </div>
        </div>
      </div>
    </Marker>
  );
}
