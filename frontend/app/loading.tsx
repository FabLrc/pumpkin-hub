export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent animate-spin" />
        <p className="font-mono text-xs text-text-dim uppercase tracking-widest">
          Loading...
        </p>
      </div>
    </main>
  );
}
