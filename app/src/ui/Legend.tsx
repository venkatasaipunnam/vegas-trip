import { useTrip } from "../store";

const WHERE: [string, string][] = [
  ["#ff4fa3", "Las Vegas"],
  ["#3fe0e8", "Los Angeles"],
  ["#ffb547", "Day trip"],
  ["#c9b6ff", "Your hotel"],
  ["#a89cc8", "If time"],
];

export default function Legend() {
  const legend = useTrip((s) => s.legend);
  if (!legend) return null;
  return (
    <aside className="legend">
      <h2>Lines on the map</h2>
      <ul>
        <li><i style={{ background: "#5ee39a" }} />Dotted — you walk it</li>
        <li><i style={{ background: "#3fe0e8" }} />Dashed — bus, monorail or Metro</li>
        <li><i style={{ background: "#ffb547" }} />Solid — cab or coach</li>
        <li><i style={{ background: "#ffd166" }} />Gold with arrows — the leg you're on</li>
      </ul>
      <h2>Colour shows where</h2>
      <ul className="two">
        {WHERE.map(([c, label]) => (
          <li key={label}><i style={{ background: c }} />{label}</li>
        ))}
      </ul>
    </aside>
  );
}
