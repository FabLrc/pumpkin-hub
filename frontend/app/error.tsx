"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="font-mono text-[120px] font-bold leading-none text-error/20 select-none">
          500
        </div>
        <h1 className="font-raleway font-bold text-2xl text-text-primary tracking-wide mt-4">
          Something Went Wrong
        </h1>
        <p className="font-mono text-sm text-text-dim mt-3 mb-2">
          An unexpected error occurred. Our team has been notified.
        </p>
        {error.digest && (
          <p className="font-mono text-[10px] text-text-dim mb-8">
            Error ID: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-black font-mono text-xs font-bold uppercase tracking-widest hover:bg-accent-light transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}
