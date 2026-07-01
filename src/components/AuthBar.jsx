import { useState } from "react";

function prettyError(e) {
  const c = e?.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password")) return "Wrong email or password.";
  if (c.includes("email-already-in-use")) return "That email already has an account — try Sign in.";
  if (c.includes("weak-password")) return "Password should be at least 6 characters.";
  if (c.includes("invalid-email")) return "That doesn't look like a valid email.";
  if (c.includes("popup-closed") || c.includes("cancelled-popup")) return "Google sign-in was cancelled.";
  return e?.message || "Something went wrong.";
}

export default function AuthBar({ auth }) {
  const { user, loading, ready, signIn, signUp, signInGoogle, signOutUser } = auth;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!ready) return <div className="authbar authbar--muted">Accounts aren’t set up yet.</div>;
  if (loading) return <div className="authbar authbar--muted">…</div>;

  if (user) {
    return (
      <div className="authbar">
        <span className="authbar__who">
          Signed in as <b>{user.email || "Google user"}</b>
        </span>
        <button className="tool" onClick={() => signOutUser()}>
          Sign out
        </button>
      </div>
    );
  }

  const run = async (fn) => {
    setErr(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(prettyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="authbar authbar--form">
      <div className="authbar__row">
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="authbar__row">
        <button className="tool" disabled={busy} onClick={() => run(() => signIn(email, password))}>
          Sign in
        </button>
        <button className="tool" disabled={busy} onClick={() => run(() => signUp(email, password))}>
          Sign up
        </button>
        <button className="tool" disabled={busy} onClick={() => run(() => signInGoogle())}>
          Google
        </button>
      </div>
      {err && <div className="authbar__err">{err}</div>}
    </div>
  );
}
