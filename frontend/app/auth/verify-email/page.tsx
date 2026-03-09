"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { verifyEmail } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "Invalid verification link.",
  );

  useEffect(() => {
    if (!token) return;

    verifyEmail(token)
      .then(() => {
        setStatus("success");
        setTimeout(() => router.push("/auth"), 3000);
      })
      .catch((err) => {
        setStatus("error");
        const message =
          err instanceof Error ? err.message : "Verification failed";
        const match = message.match(/"error":\s*"([^"]+)"/);
        setErrorMessage(
          match ? match[1] : "Invalid or expired verification link.",
        );
      });
  }, [token, router]);

  return (
    <>
      {status === "loading" && (
        <div className="flex items-center gap-3 p-4 border border-border-default bg-bg-surface">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent animate-spin" />
          <p className="font-mono text-sm text-text-primary">
            Verifying your email...
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="flex items-start gap-3 p-4 border border-success/30 bg-success/5">
          <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div>
            <p className="font-mono text-sm text-text-primary">
              Email verified successfully
            </p>
            <p className="font-mono text-xs text-text-dim mt-1">
              Redirecting to sign in...
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-3 p-4 border border-error/30 bg-error/5">
          <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div>
            <p className="font-mono text-sm text-error">{errorMessage}</p>
            <Link
              href="/auth"
              className="font-mono text-xs text-accent hover:text-accent-light mt-2 inline-block"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-dim hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>

        <div className="border border-border-default bg-bg-elevated p-8">
          <div className="mb-8">
            <div className="w-10 h-10 bg-accent flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-black" />
            </div>
            <h1 className="font-raleway font-bold text-xl text-text-primary tracking-wide">
              Email Verification
            </h1>
          </div>

          <Suspense
            fallback={
              <div className="font-mono text-xs text-text-dim">Loading...</div>
            }
          >
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
