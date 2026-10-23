import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createAccount, signIn } from "../lib/accounts";
import { seedOwner } from "../lib/plans";

/** Sign in to keep plans under a name.  Stated plainly on the page: this is a profile on
 *  this device, not a login to a server, because there is no server. */
export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "new">("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      seedOwner();
      if (mode === "new") await createAccount(user, pass);
      await signIn(user, pass);
      nav("/plans", { replace: true });
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page authpage">
      <div className="card auth">
        <div className="authtop">
          <h1>Neon <span>&amp;</span> Pacific</h1>
          <p className="tagline">Your trips, mapped</p>
        </div>

        {/* A pair of tabs rather than a link that quietly changes what the button does. */}
        <div className="segmented" role="tablist">
          <button role="tab" aria-selected={mode === "in"}
            onClick={() => { setMode("in"); setErr(null); }}>Sign in</button>
          <button role="tab" aria-selected={mode === "new"}
            onClick={() => { setMode("new"); setErr(null); }}>New profile</button>
        </div>

        <form onSubmit={submit}>
          <label className="lf">
            <span>Username</span>
            <input value={user} onChange={(e) => setUser(e.target.value)}
              autoCapitalize="none" autoCorrect="off" autoComplete="username" />
          </label>
          <label className="lf">
            <span>Password</span>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
              autoComplete={mode === "in" ? "current-password" : "new-password"} />
          </label>
          {err && <p className="bad">{err}</p>}
          <button className="btn done wide" disabled={busy} type="submit">
            {busy ? "One moment…" : mode === "in" ? "Sign in" : "Create profile"}
          </button>
        </form>

        <details className="fineprint">
          <summary>Where does this sign-in go?</summary>
          <p>
            Nowhere. Profiles live in this browser, on this device — there is no server
            behind this site. Your password is kept only as a PBKDF2 digest, never in the
            clear, but anyone holding this unlocked device can read the plans saved here,
            and clearing site data deletes them. Use a password you do not use elsewhere.
          </p>
        </details>

        <Link className="linky" to="/">← Back to the map</Link>
      </div>
    </div>
  );
}
