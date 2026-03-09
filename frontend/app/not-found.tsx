import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="font-mono text-[120px] font-bold leading-none text-accent/20 select-none">
          404
        </div>
        <h1 className="font-raleway font-bold text-2xl text-text-primary tracking-wide mt-4">
          Page Not Found
        </h1>
        <p className="font-mono text-sm text-text-dim mt-3 mb-8">
          The resource you&apos;re looking for doesn&apos;t exist or has been
          moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-black font-mono text-xs font-bold uppercase tracking-widest hover:bg-accent-light transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/explorer"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-border-default text-text-primary font-mono text-xs font-bold uppercase tracking-widest hover:border-border-hover transition-colors"
          >
            Browse Plugins
          </Link>
        </div>
      </div>
    </main>
  );
}
