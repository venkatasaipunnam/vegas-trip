/** Accounts, such as they can be on a site with no server.
 *
 *  The site is static — Vercel serves files, there is nothing to authenticate against —
 *  so an account here is a **profile on this device**, not a security boundary: anyone
 *  holding the unlocked phone can read the stored plans, and clearing site data deletes
 *  them.  What it does give is a name to save plans under and a password to keep a
 *  casual passer-by out.
 *
 *  The password itself is never stored.  It is stretched with PBKDF2-SHA256 (120k
 *  iterations) against a per-account salt and only the digest is kept, so the stored
 *  data does not hand anyone the password — which matters because people reuse them.
 *
 *  When this needs to be real (plans that follow him from phone to laptop, a password
 *  that is checked somewhere he cannot edit), the replacement is Vercel KV or Postgres
 *  behind serverless routes, and only this file and lib/plans.ts change. */

const ACCOUNTS = "np-accounts";
const SESSION = "np-session";
const ITERATIONS = 120_000;

export interface Account {
  user: string;
  salt: string;
  hash: string;
  created: string;
}

const hex = (b: ArrayBuffer) =>
  [...new Uint8Array(b)].map((n) => n.toString(16).padStart(2, "0")).join("");

const bytes = (h: string) =>
  new Uint8Array(h.match(/.{2}/g)!.map((p) => parseInt(p, 16)));

export async function derive(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: bytes(salt), iterations: ITERATIONS, hash: "SHA-256" },
    key, 256,
  );
  return hex(bits);
}

function read(): Record<string, Account> {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS) || "{}");
  } catch {
    return {};
  }
}
function write(all: Record<string, Account>) {
  try {
    localStorage.setItem(ACCOUNTS, JSON.stringify(all));
  } catch {
    /* private browsing: the app still runs, it just cannot remember him */
  }
}

export const accountNames = () => Object.keys(read());
export const hasAccount = (user: string) => !!read()[user.trim().toLowerCase()];

/** Put an account in place without knowing the password — used once, to seed the
 *  owner's own account from a digest computed at build time. */
export function seedAccount(a: Account) {
  const all = read();
  if (all[a.user]) return;
  all[a.user] = a;
  write(all);
}

export async function createAccount(user: string, password: string) {
  const name = user.trim().toLowerCase();
  if (!name) throw new Error("Pick a username.");
  if (password.length < 6) throw new Error("Use at least 6 characters.");
  const all = read();
  if (all[name]) throw new Error("That username is taken on this device.");
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  all[name] = { user: name, salt, hash: await derive(password, salt), created: new Date().toISOString() };
  write(all);
  return name;
}

export async function signIn(user: string, password: string) {
  const name = user.trim().toLowerCase();
  const acc = read()[name];
  // The same message either way: which usernames exist is not worth leaking.
  const wrong = new Error("That username and password do not match.");
  if (!acc) throw wrong;
  if (await derive(password, acc.salt) !== acc.hash) throw wrong;
  try { localStorage.setItem(SESSION, name); } catch { /* nothing to do */ }
  return name;
}

export function signOut() {
  try { localStorage.removeItem(SESSION); } catch { /* nothing to do */ }
}

export function currentUser(): string | null {
  try {
    const u = localStorage.getItem(SESSION);
    return u && read()[u] ? u : null;
  } catch {
    return null;
  }
}
