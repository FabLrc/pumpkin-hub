"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle, Lock } from "lucide-react";
import { resetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!token) {
    return (
      <div className="flex items-start gap-2 p-3 border border-error/30 bg-error/5 text-error text-xs font-mono">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Invalid reset link. Please request a new password reset.</span>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => router.push("/auth"), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      const match = /"error":\s*"([^"]+)"/.exec(message);
      setError(match ? match[1] : message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-start gap-3 p-4 border border-success/30 bg-success/5">
        <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
        <div>
          <p className="font-mono text-sm text-text-primary">
            Password reset successful
          </p>
          <p className="font-mono text-xs text-text-dim mt-1">
            Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 p-3 border border-error/30 bg-error/5 text-error text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="new-password"
          className="block font-mono text-xs text-text-muted uppercase tracking-widest mb-1"
        >
          New Password
        </label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          className="w-full px-3 py-2 bg-bg-surface border border-border-default focus:border-accent outline-none font-mono text-sm text-text-primary placeholder:text-text-dim transition-colors"
          placeholder="Min. 8 characters"
        />
      </div>

      <div>
        <label
          htmlFor="confirm-password"
          className="block font-mono text-xs text-text-muted uppercase tracking-widest mb-1"
        >
          Confirm Password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          className="w-full px-3 py-2 bg-bg-surface border border-border-default focus:border-accent outline-none font-mono text-sm text-text-primary placeholder:text-text-dim transition-colors"
          placeholder="Repeat your password"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-black font-mono text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? "Resetting..." : "Set New Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
              <Lock className="w-5 h-5 text-black" />
            </div>
            <h1 className="font-raleway font-bold text-xl text-text-primary tracking-wide">
              Set New Password
            </h1>
            <p className="font-mono text-xs text-text-dim mt-1">
              Choose a strong password for your account
            </p>
          </div>

          <Suspense
            fallback={
              <div className="font-mono text-xs text-text-dim">Loading...</div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
