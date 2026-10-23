import { useNavigate } from "react-router-dom";
import { OWNER_USER, listPlans } from "../lib/plans";
import { currentUser } from "../lib/accounts";

/** Switching between plans.  The Vegas itinerary is one of the list for the profile it
 *  belongs to, and every saved plan can be looked at the same way, so this sits at the
 *  top of both the trip page and the viewer. */
export default function PlanPicker({ current }: { current: string }) {
  const nav = useNavigate();
  const user = currentUser();
  if (!user) return null;
  const plans = listPlans(user).filter((p) => p.id !== "vegas-oct-2026");

  return (
    <label className="planpick">
      <span>Viewing</span>
      <select
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "edit") nav(current === "trip" ? "/plans" : `/plans/${current}`);
          else nav(v === "trip" ? "/trip" : `/plans/${v}/view`);
        }}
      >
        {user === OWNER_USER && <option value="trip">Vegas &amp; LA · Oct 24–31</option>}
        {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        <option value="edit">{current === "trip" ? "— All my plans —" : "— Edit this plan —"}</option>
      </select>
    </label>
  );
}
