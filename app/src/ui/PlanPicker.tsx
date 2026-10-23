import { Link, useNavigate } from "react-router-dom";
import { OWNER_USER, listPlans } from "../lib/plans";
import { currentUser } from "../lib/accounts";

/** Switching between plans.
 *
 *  This was a <select>, which quietly failed: its value is "trip" on the trip page, and
 *  for anyone whose list does not contain that option the browser shows the first plan
 *  instead — so picking that plan changed nothing and fired no event, and the page stayed
 *  on whatever it was.  Buttons cannot drift from what they do. */
export default function PlanPicker({ current }: { current: string }) {
  const nav = useNavigate();
  const user = currentUser();
  if (!user) return null;

  const plans = listPlans(user).filter((p) => p.id !== "vegas-oct-2026");
  const vegas = user === OWNER_USER;
  if (!vegas && !plans.length) return null;

  return (
    <nav className="planpick" aria-label="Which plan to view">
      <span>Viewing</span>
      <div className="ppscroll">
        {vegas && (
          <button className="ppchip" aria-pressed={current === "trip"}
            onClick={() => nav("/trip")}>Vegas &amp; LA</button>
        )}
        {plans.map((p) => (
          <button key={p.id} className="ppchip" aria-pressed={current === p.id}
            onClick={() => nav(`/plans/${p.id}/view`)}>{p.name}</button>
        ))}
        <Link className="ppchip ghost" to={current === "trip" ? "/plans" : `/plans/${current}`}>
          {current === "trip" ? "All plans" : "Edit"}
        </Link>
      </div>
    </nav>
  );
}
