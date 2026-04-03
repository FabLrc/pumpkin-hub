"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Github, Mail, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getOAuthLoginUrl,
  registerWithEmail,
  loginWithEmail,
  getAuthMePath,
} from "@/lib/api";
import { useCurrentUser } from "@/lib/hooks";
import { mutate } from "swr";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated.
  if (user) {
    router.replace("/");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await registerWithEmail({ username, email, password });
        toast.success("Account created! Check your email to verify your address.");
      } else {
        await loginWithEmail({ email, password });
        toast.success("Welcome back!");
      }
      // Revalidate the user cache so Navbar picks up the session immediately.
      await mutate(getAuthMePath());
      router.push("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      // Extract the JSON error message if present.
      const match = /"error":\s*"([^"]+)"/.exec(message);
      const errorMsg = match ? match[1] : message;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-dim hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>

        {/* Card */}
        <div className="border border-border-default bg-bg-elevated p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/pumpkinhub_logo.png"
                alt="Pumpkin Hub logo"
                width={40}
                height={40}
                className="w-10 h-10 object-cover"
              />
              <span className="font-raleway font-bold text-sm tracking-widest uppercase text-text-primary">
                Pumpkin Hub
              </span>
            </div>
            <h1 className="font-raleway font-bold text-xl text-text-primary tracking-wide">
              {mode === "login" ? "Sign In" : "Create Account"}
            </h1>
            <p className="font-mono text-xs text-text-dim mt-1">
              {mode === "login"
                ? "Welcome back to Pumpkin Hub"
                : "Join the Pumpkin MC community"}
            </p>
          </div>

          {/* OAuth Providers */}
          <div className="space-y-2 mb-6">
            <a
              href={getOAuthLoginUrl("github")}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border-default hover:border-border-hover bg-bg-surface hover:bg-bg-elevated transition-colors font-mono text-xs text-text-primary"
            >
              <Github className="w-4 h-4" />
              Continue with GitHub
            </a>
            <a
              href={getOAuthLoginUrl("google")}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border-default hover:border-border-hover bg-bg-surface hover:bg-bg-elevated transition-colors font-mono text-xs text-text-primary"
            >
              <GoogleIcon />
              Continue with Google
            </a>
            <a
              href={getOAuthLoginUrl("discord")}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border-default hover:border-border-hover bg-bg-surface hover:bg-bg-elevated transition-colors font-mono text-xs text-text-primary"
            >
              <DiscordIcon />
              Continue with Discord
            </a>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 border-t border-border-default" />
            <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
              or
            </span>
            <div className="flex-1 border-t border-border-default" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 border border-error/30 bg-error/5 text-error text-xs font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {mode === "register" && (
              <div>
                <label
                  htmlFor="username"
                  className="block font-mono text-xs text-text-muted uppercase tracking-widest mb-1"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  maxLength={39}
                  autoComplete="username"
                  className="w-full px-3 py-2 bg-bg-surface border border-border-default focus:border-accent outline-none font-mono text-sm text-text-primary placeholder:text-text-dim transition-colors"
                  placeholder="rustcraftdev"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block font-mono text-xs text-text-muted uppercase tracking-widest mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 bg-bg-surface border border-border-default focus:border-accent outline-none font-mono text-sm text-text-primary placeholder:text-text-dim transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block font-mono text-xs text-text-muted uppercase tracking-widest mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                name={mode === "register" ? "new-password" : "current-password"}
                className="w-full px-3 py-2 bg-bg-surface border border-border-default focus:border-accent outline-none font-mono text-sm text-text-primary placeholder:text-text-dim transition-colors"
                placeholder="Min. 8 characters"
              />
              {mode === "login" && (
                <Link
                  href="/auth/forgot-password"
                  className="block mt-1 font-mono text-[10px] text-text-subtle hover:text-accent transition-colors text-right"
                >
                  Forgot password?
                </Link>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-black font-mono text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              {(() => {
                if (isSubmitting) return "Processing...";
                return mode === "login" ? "Sign In with Email" : "Create Account";
              })()}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="font-mono text-xs text-text-subtle hover:text-accent transition-colors cursor-pointer"
            >
              {mode === "login"
                ? "Don't have an account? Create one"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="font-mono text-[10px] text-text-dim text-center mt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
}

// ── Inline SVG icons (no external dependency) ─────────────────────────────

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
