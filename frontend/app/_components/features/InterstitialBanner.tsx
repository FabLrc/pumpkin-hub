export function InterstitialBanner() {
  return (
    <section
      aria-hidden="true"
      className="relative border-y border-border-default bg-bg-deep overflow-hidden"
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-accent/20" />
      <div className="absolute top-0 left-0 h-px w-24 bg-accent" />
      <div className="absolute bottom-0 right-0 h-px w-24 bg-accent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-24 lg:py-32">
        <div className="font-mono text-[10px] sm:text-[11px] text-accent tracking-widest uppercase mb-6 sm:mb-8">
          {"// from raw performance  →  to a complete ecosystem"}
        </div>
        <h2
          className="font-raleway font-black leading-[0.95] sm:leading-[0.92] tracking-tight text-text-primary"
          style={{ fontSize: "clamp(2rem, 9vw, 7rem)" }}
        >
          <span className="block">Five milliseconds.</span>
          <span className="block">
            One hundred <span className="text-accent">megabytes</span>.
          </span>
          <span className="block">
            One <span className="text-accent">registry</span>.
          </span>
        </h2>
        <div className="mt-8 sm:mt-10 flex items-center gap-3 font-mono text-[10px] sm:text-[11px] text-text-dim tracking-widest uppercase">
          <div className="h-px w-8 sm:w-12 bg-border-default shrink-0" />
          <span>that&apos;s the engine — here&apos;s the workflow</span>
        </div>
      </div>
    </section>
  );
}
