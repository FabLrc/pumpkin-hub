"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      const match = message.match(/"error":\s*"([^"]+)"/);
      setError(match ? match[1] : message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/auth"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-dim hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>

        <div className="border border-border-default bg-bg-elevated p-8">
          <div className="mb-8">
            <div className="w-10 h-10 bg-accent flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-black" />
            </div>
            <h1 className="font-raleway font-bold text-xl text-text-primary tracking-wide">
              Reset Password
            </h1>
            <p className="font-mono text-xs text-text-dim mt-1">
              Enter your email to receive a password reset link
            </p>
          </div>

          {success ? (
            <div className="flex items-start gap-3 p-4 border border-success/30 bg-success/5">
              <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-sm text-text-primary">
                  Check your inbox
                </p>
                <p className="font-mono text-xs text-text-dim mt-1">
                  If an account with that email exists, we&apos;ve sent a
                  password reset link. Check your spam folder if you don&apos;t
                  see it.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 border border-error/30 bg-error/5 text-error text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block font-mono text-xs text-text-muted uppercase tracking-widest mb-1"
                >
                  Email Address
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-black font-mono text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
