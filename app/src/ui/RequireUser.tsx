import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { currentUser } from "../lib/accounts";

/** Pages that belong to a profile rather than to anyone who has the link.
 *  The Vegas itinerary is Sai's own plan, not a public page, so it waits behind a
 *  sign-in like the saved plans do.  The landing map stays open: the route finder is
 *  useful to anyone and gives nothing of his away. */
export default function RequireUser({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const [user] = useState(() => currentUser());

  useEffect(() => {
    if (!user) nav("/login", { replace: true });
  }, [user, nav]);

  return user ? <>{children}</> : null;
}
