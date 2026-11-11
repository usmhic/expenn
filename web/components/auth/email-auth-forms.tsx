"use client";

import { FormEvent, useRef, useState } from "react";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";

function AuthAlert({ message }: { message: string }) {
  return (
    <div className="notice notice-danger">
      {message}
    </div>
  );
}

// ── Email OTP form (2-step: email → 6-digit code) ────────────────────────────

export function EmailMagicLinkForm({
  callbackURL = "/onboarding",
}: {
  callbackURL?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  // Step 1 — send OTP
  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const { error: err } = await authClient.sendOtp(email.trim().toLowerCase());
    setPending(false);
    if (err) { setError(err); return; }
    setStage("code");
    setTimeout(() => codeRef.current?.focus(), 100);
  }

  // Step 2 — verify OTP
  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const { error: err } = await authClient.verifyOtp(email.trim().toLowerCase(), code.trim());
    setPending(false);
    if (err) { setError(err); return; }
    router.push(callbackURL);
  }

  if (stage === "code") {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-4">
        <div className="notice notice-success">
          <Mail className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400" />
          <p className="text-sm text-teal-700 dark:text-teal-300">
            We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
          </p>
        </div>

        {error && <AuthAlert message={error} />}

        <label className="field">
          Verification code
          <input
            ref={codeRef}
            type="text"
            inputMode="numeric"
            required
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="123456"
            className="form-control h-14 text-center font-mono text-2xl tracking-[0.5em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            disabled={pending}
          />
        </label>

        <button type="submit" className="primary-button button-lg w-full" disabled={pending || code.length < 6}>
          {pending ? <><Spinner className="size-4" /> Verifying…</> : <>Verify &amp; sign in <ArrowRight className="size-4" /></>}
        </button>

        <button
          type="button"
          className="w-full text-center text-xs text-muted-foreground underline underline-offset-2"
          onClick={() => { setStage("email"); setCode(""); setError(""); }}
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendOtp} className="space-y-4">
      {error && <AuthAlert message={error} />}
      <label className="field">
        Email address
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="form-control h-11"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
      </label>
      <button type="submit" className="primary-button button-lg w-full" disabled={pending}>
        {pending ? <><Spinner className="size-4" /> Sending code…</> : <>Continue with email <ArrowRight className="size-4" /></>}
      </button>
    </form>
  );
}

// ── Active Directory sign-in form ─────────────────────────────────────────────

export function ADSignInForm({ callbackURL = "/onboarding" }: { callbackURL?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const { error: err } = await authClient.signInWithAD(username.trim(), password);
    setPending(false);
    if (err) { setError(err); return; }
    router.push(callbackURL);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <AuthAlert message={error} />}
      <label className="field">
        Username (DOMAIN\user or UPN)
        <input
          type="text"
          required
          autoComplete="username"
          placeholder="CORP\username or user@corp.com"
          className="form-control h-11 font-mono"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={pending}
        />
      </label>
      <label className="field">
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="form-control h-11"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
        />
      </label>
      <button type="submit" className="primary-button button-lg w-full" disabled={pending}>
        {pending
          ? <><Spinner className="size-4" /> Authenticating…</>
          : <><KeyRound className="size-4" /> Sign in with Active Directory</>}
      </button>
    </form>
  );
}

// ── Password sign-in form ─────────────────────────────────────────────────────

export function PasswordSignInForm({ callbackURL = "/onboarding" }: { callbackURL?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const { error: err } = await authClient.signInWithPassword(email.trim().toLowerCase(), password);
    setPending(false);
    if (err) { setError(err); return; }
    router.push(callbackURL);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <AuthAlert message={error} />}
      <label className="field">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="form-control h-11"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
      </label>
      <label className="field">
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="form-control h-11"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
        />
      </label>
      <button type="submit" className="primary-button button-lg w-full" disabled={pending}>
        {pending ? <><Spinner className="size-4" /> Signing in…</> : <>Sign in <ArrowRight className="size-4" /></>}
      </button>
    </form>
  );
}
