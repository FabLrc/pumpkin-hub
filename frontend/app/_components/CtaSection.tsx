import { Server, Upload } from "lucide-react";
import { Button } from "@/components/ui";

export function CtaSection() {
  return (
    <section className="border-t border-border-default grid-bg relative overflow-hidden">
      {/* Ambient orange radial glow — top-right corner */}
      <div className="cta-glow pointer-events-none absolute -top-24 -right-24 w-96 h-96 opacity-20" />
      {/* Faint left accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent/30 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-accent" />
            <span className="font-mono text-xs text-accent tracking-widest uppercase">
              Get started
            </span>
          </div>
          <h2 className="font-raleway font-black text-4xl text-text-primary mb-3">
            Ready to ship your server?
          </h2>
          <p className="font-raleway text-text-dim max-w-md">
            Launch a ready-to-run Pumpkin stack with Server Builder, then publish your own plugin.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0 flex-wrap">
          <Button variant="ghost" href="/explorer" className="text-sm px-6 py-3">
            Browse Plugins
          </Button>
          <Button variant="ghost" href="/server-builder" className="text-sm px-6 py-3">
            <Server className="w-[14px] h-[14px]" />
            Open Server Builder
          </Button>
          <Button href="/plugins/new" className="text-sm px-6 py-3">
            Publish a Plugin <Upload className="w-[14px] h-[14px]" />
          </Button>
        </div>
      </div>
    </section>
  );
}
