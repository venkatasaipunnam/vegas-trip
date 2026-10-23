import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { currentUser } from "../lib/accounts";
import { OWNER_USER } from "../lib/plans";

/** Pages that belong to a profile rather than to anyone who has the link.
 *  The Vegas itinerary is Sai's own plan, not a public page, so it waits behind a
 *  sign-in like the saved plans do.  The landing map stays open: the route finder is
 *  useful to anyone and gives nothing of his away. */
export default function RequireUser({ children, owner }: { children: ReactNode; owner?: boolean }) {
  const nav = useNavigate();
  const [user] = useState(() => currentUser());
  // `owner` guards the Vegas itinerary.  Signing in is not enough for it: it is one
  // person's trip, and any other profile that reached /trip could read the whole thing.
  const allowed = !!user && (!owner || user === OWNER_USER);

  useEffect(() => {
    if (!user) nav("/login", { replace: true });
    else if (!allowed) nav("/plans", { replace: true });
  }, [user, allowed, nav]);

  return allowed ? <>{children}</> : null;
}
