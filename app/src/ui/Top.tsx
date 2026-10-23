import { useTrip } from "../store";

/** Brand and the controls that change what the map shows.  "Me" is the geolocate
 *  control MapLibre already draws bottom-right; this button clicks it, so there is
 *  one implementation of locating him and it sits where his thumb is. */
export default function Top() {
  const { is3d, sat, showAll, legend, toggle } = useTrip();
  const locate = () =>
    document.querySelector<HTMLButtonElement>(".maplibregl-ctrl-geolocate")?.click();

  return (
    <div className="top">
      <div className="brand">
        <h1>Neon <span>&amp;</span> Pacific</h1>
        <small>OCT 24–31 · VEGAS · LA · CANYON</small>
      </div>
      <div className="ctrls">
        <button className="ctl" aria-pressed={is3d} onClick={() => toggle("is3d")}>3D</button>
        <button className="ctl" aria-pressed={sat} onClick={() => toggle("sat")}>Satellite</button>
        <button className="ctl" onClick={locate}>Me</button>
        <button className="ctl" aria-pressed={showAll} onClick={() => toggle("showAll")}>All stops</button>
        <button className="ctl" aria-pressed={legend} onClick={() => toggle("legend")}>Key</button>
      </div>
    </div>
  );
}
