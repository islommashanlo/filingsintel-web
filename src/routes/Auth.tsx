import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, api, errorMessage } from "@/api/client";
import { safeNext, useLogin, useSignup } from "@/features/session";

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  const { label, ...rest } = props;
  return (
    <label style={{ display: "block" }}>
      <span className="field-label" style={{ display: "flex", justifyContent: "space-between" }}>{label}</span>
      <input className="input" {...rest} />
    </label>
  );
}

function authError(e: unknown) {
  if (e instanceof ApiError && e.code === "INVALID_CREDENTIALS") return "Email or password is incorrect.";
  if (e instanceof ApiError && e.status === 429) return `Too many attempts. Try again in ${e.retryAfter ? Math.ceil(e.retryAfter / 60) : "a few"} minute(s).`;
  return errorMessage(e);
}

export function Login() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form className="auth-card" onSubmit={(e) => { e.preventDefault(); login.mutate({ email, password }, { onSuccess: () => navigate(safeNext(sp.get("next")), { replace: true }) }); }}>
      <div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="muted" style={{ textAlign: "center" }}>Sign in to your InsideLedger account</p>
      </div>
      <div className="auth-panel">
      <Field label="Email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label={<><span>Password</span><Link to="/forgot-password">Forgot password?</Link></>} type="password" autoComplete="current-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      {login.error && <div className="err" role="alert">{authError(login.error)}</div>}
      <button type="submit" className="btn primary lg block" disabled={login.isPending}>{login.isPending ? "Signing in…" : "Sign in"}</button>
      </div>
      <p className="muted" style={{ textAlign: "center", fontSize: 13 }}>New to InsideLedger? <Link to="/signup">Create an account</Link></p>
    </form>
  );
}

export function Signup() {
  const navigate = useNavigate();
  const signup = useSignup();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const strength = Math.min(4, Math.floor(password.length / 4) + (/[^a-zA-Z]/.test(password) && password.length >= 8 ? 1 : 0));
  return (
    <form className="auth-card" onSubmit={(e) => { e.preventDefault(); signup.mutate({ email, password }, { onSuccess: () => navigate("/onboarding", { replace: true }) }); }}>
      <div>
        <h1 className="auth-title">Create your account</h1>
        <p className="muted" style={{ textAlign: "center" }}>Free forever. No card required.</p>
      </div>
      <div className="auth-panel">
      <Field label="Email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div>
        <Field label="Password" type="password" autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="row" style={{ gap: 4, marginTop: 6 }} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <span key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < strength ? "var(--acc)" : "var(--elev)" }} />)}
        </div>
      </div>
      <label className="row muted" style={{ alignItems: "flex-start", fontSize: 12.5 }}>
        <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
        <span>I agree to the <Link to="/terms" target="_blank">Terms</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>, and understand InsideLedger is not investment advice.</span>
      </label>
      {signup.error && <div className="err" role="alert">{authError(signup.error)}</div>}
      <button type="submit" className="btn primary lg block" disabled={signup.isPending}>{signup.isPending ? "Creating account…" : "Continue"}</button>
      </div>
      <p className="muted" style={{ textAlign: "center", fontSize: 13 }}>Already have an account? <Link to="/login">Sign in</Link></p>
    </form>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const send = useMutation({ mutationFn: () => api.post("/auth/password/forgot", { email }) });
  if (send.isSuccess) {
    return (
      <div className="auth-card" style={{ textAlign: "center" }}>
        <h1 className="auth-title">Check your inbox</h1>
        <p className="muted">If an account exists for <b>{email}</b>, we sent a reset link. It expires in 15 minutes.</p>
        <button type="button" className="btn" onClick={() => send.reset()}>Use a different email</button>
        <Link to="/login">← Back to sign in</Link>
      </div>
    );
  }
  return (
    <form className="auth-card" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
      <div>
        <h1 className="auth-title">Reset your password</h1>
        <p className="muted">Enter your email and we’ll send you a reset link.</p>
      </div>
      <Field label="Email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      {send.error && <div className="err" role="alert">{authError(send.error)}</div>}
      <button type="submit" className="btn primary lg block" disabled={send.isPending}>{send.isPending ? "Sending…" : "Send reset link"}</button>
      <Link to="/login" style={{ textAlign: "center" }}>← Back to sign in</Link>
    </form>
  );
}

/** The emailed link carries the token in the URL fragment, which never reaches a server. */
export function ResetPassword() {
  const token = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  useEffect(() => {
    const m = /(?:^|[#&])token=([^&]+)/.exec(window.location.hash);
    if (m) {
      token.current = decodeURIComponent(m[1]!);
      // Remove the token from the address bar and history once captured.
      window.history.replaceState(null, "", window.location.pathname);
    }
    setReady(true);
  }, []);
  const reset = useMutation({ mutationFn: () => api.post("/auth/password/reset", { token: token.current, password, password_confirmation: confirm }) });
  if (!ready) return null;
  if (reset.isSuccess) {
    return (
      <div className="auth-card" style={{ textAlign: "center" }}>
        <h1 className="auth-title">Password updated</h1>
        <p className="muted">You can now sign in with your new password.</p>
        <Link to="/login" className="btn primary lg">Sign in</Link>
      </div>
    );
  }
  const invalid = !token.current || (reset.error instanceof ApiError && reset.error.code === "INVALID_RESET_TOKEN");
  if (invalid) {
    return (
      <div className="auth-card" style={{ textAlign: "center" }}>
        <h1 className="auth-title">This reset link isn’t valid</h1>
        <p className="muted">Links expire after 15 minutes and work once.</p>
        <Link to="/forgot-password" className="btn primary lg">Request a new link</Link>
      </div>
    );
  }
  const mismatch = confirm.length > 0 && confirm !== password;
  return (
    <form className="auth-card" onSubmit={(e) => { e.preventDefault(); if (!mismatch) reset.mutate(); }}>
      <h1 className="auth-title">Set a new password</h1>
      <Field label="New password" type="password" autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Field label="Confirm password" type="password" autoComplete="new-password" required aria-invalid={mismatch} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {mismatch && <div className="err">Passwords don’t match.</div>}
      {reset.error && <div className="err" role="alert">{errorMessage(reset.error)}</div>}
      <button type="submit" className="btn primary lg block" disabled={reset.isPending || mismatch}>{reset.isPending ? "Saving…" : "Update password"}</button>
    </form>
  );
}
