import { Marker } from "react-map-gl/maplibre";
import { dayById, places, stopsOf } from "../data";
import { atOf, useTrip } from "../store";
import { legModeOf } from "../lib/legs";
import { Figure } from "../ui/Icons";

/** The green figure standing on the stop Sai is at right now.  anchor="bottom" puts his
 *  feet on the coordinate rather than his waist, and he stands exactly on it: the old
 *  sideways nudge kept him clear of the pin but meant the two markers disagreed about
 *  where the stop was, which is the same complaint as a pin in the wrong place.  The
 *  pin lifts out of his way instead (.mk.under in the stylesheet). */
export default function Me() {
  const day = useTrip((s) => s.day);
  const atIdx = useTrip((s) => atOf(s.progress, s.day));
  const modePick = useTrip((s) => s.modePick);
  const traveling = useTrip((s) => s.traveling);
  const stops = stopsOf(dayById(day));
  // While a day is playing, the moving figure is the one on the map.
  if (!stops.length || traveling) return null;

  const i = Math.min(atIdx, stops.length - 1);
  const p = places[stops[i]];
  // He strides when the leg ahead is a walk and stands and breathes otherwise.
  const walking = i < stops.length - 1 && legModeOf(day, i, modePick) === "walk";

  return (
    <Marker longitude={p.lng} latitude={p.lat} anchor="bottom">
      <div className={`mewrap${walking ? " walking" : ""}`} aria-label="You are here">
        <div className="mescale">
          <div className="mering" />
          <div className="me"><Figure /></div>
        </div>
      </div>
    </Marker>
  );
}
