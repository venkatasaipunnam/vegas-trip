import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { currentUser } from "../lib/accounts";
import { OWNER_USER, listPlans } from "../lib/plans";

/** Opening a plan from the map he lands on.
 *
 *  Getting to a plan used to be: My plans → the plan → View, three taps deep for the
 *  thing he opens the app to look at.  This puts every plan one tap from the landing
 *  map.  A button and a list rather than a <select>, for the same reason as the picker
 *  inside the pages: a select's value can disagree with the page and then swallow the
 *  tap that would have fixed it. */
export default function PlanMenu() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  const user = currentUser();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  if (!user) return <Link className="toplan" to="/login">Sign in →</Link>;

  const plans = listPlans(user).filter((p) => p.id !== "vegas-oct-2026");
  const go = (to: string) => { setOpen(false); nav(to); };

  return (
    <div className="planmenu" ref={box}>
      <button className="toplan" aria-expanded={open} onClick={() => setOpen(!open)}>
        My plans ▾
      </button>
      {open && (
        <div className="pmlist" role="menu">
          {user === OWNER_USER && (
            <button role="menuitem" onClick={() => go("/trip")}>
              <b>Vegas &amp; LA · Oct 24–31</b><span>8 days · the booked trip</span>
            </button>
          )}
          {plans.map((p) => (
            <button key={p.id} role="menuitem" onClick={() => go(`/plans/${p.id}/view`)}>
              <b>{p.name}</b>
              <span>{p.days.length} day{p.days.length === 1 ? "" : "s"} · {
                p.days.reduce((n, d) => n + d.stops.length, 0)} stops</span>
            </button>
          ))}
          {!plans.length && user !== OWNER_USER && (
            <p className="pmnone">No saved plans yet.</p>
          )}
          <Link className="pmmanage" to="/plans" onClick={() => setOpen(false)}>
            Manage plans →
          </Link>
        </div>
      )}
    </div>
  );
}
