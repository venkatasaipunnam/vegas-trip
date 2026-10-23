import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { currentUser, signOut } from "../lib/accounts";
import { OWNER_USER, deletePlan, duplicatePlan, emptyPlan, listPlans, savePlan, seedOwner, vegasPlan, type Plan } from "../lib/plans";

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const countStops = (p: Plan) => p.days.reduce((n, d) => n + d.stops.length, 0);

/** Every plan this profile has saved: open one, copy it, or start another. */
export default function Plans() {
  const nav = useNavigate();
  const [user, setUser] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    seedOwner();
    const u = currentUser();
    if (!u) { nav("/login", { replace: true }); return; }
    setUser(u);
    setPlans(listPlans(u));
  }, [nav]);

  const refresh = (u: string) => setPlans(listPlans(u));

  const create = () => {
    if (!user) return;
    const p = emptyPlan(name);
    savePlan(user, p);
    nav(`/plans/${p.id}`);
  };

  if (!user) return null;

  return (
    <div className="page">
      <div className="phead">
        <div>
          <h1>My plans</h1>
          <p className="sub">Signed in as {user}</p>
        </div>
        <button className="btn ghost" onClick={() => { signOut(); nav("/login"); }}>Sign out</button>
      </div>

      {naming ? (
        <div className="card">
          <label className="lf">
            <span>Name this trip</span>
            <input autoFocus value={name} placeholder="Weekend in Vegas"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()} />
          </label>
          <div className="row2">
            <button className="btn done" onClick={create}>Create</button>
            <button className="btn ghost" onClick={() => setNaming(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn done wide" onClick={() => { setName(""); setNaming(true); }}>
          + New trip plan
        </button>
      )}

      <ul className="plans">
        {plans.map((p) => (
          <li key={p.id}>
            <Link to={`/plans/${p.id}`}>
              <b>{p.name}</b>
              <span>{p.days.length} day{p.days.length === 1 ? "" : "s"} · {countStops(p)} stops · saved {when(p.updated)}</span>
            </Link>
            <div className="pacts">
              <button onClick={() => { duplicatePlan(user, p.id); refresh(user); }}>Copy</button>
              <button className="del" onClick={() => {
                if (confirm(`Delete “${p.name}”? This cannot be undone.`)) {
                  deletePlan(user, p.id);
                  refresh(user);
                }
              }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>

      {!plans.length && <p className="fine">No plans yet. Start one above.</p>}
      {/* The Vegas itinerary is one person's trip, so only that profile is offered it. */}
      {user === OWNER_USER && !plans.some((p) => p.id === "vegas-oct-2026") && (
        <button className="linky" onClick={() => { savePlan(user, vegasPlan()); refresh(user); }}>
          + Add the Vegas &amp; LA trip as a plan
        </button>
      )}
      <Link className="linky" to="/">← Back to the map</Link>
    </div>
  );
}
