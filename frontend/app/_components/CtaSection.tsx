import { Server, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

interface CtaSectionProps {
  readonly authorsCount?: number;
}

function DiscordLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 127.14 96.36"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
    </svg>
  );
}

function GitHubLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 98 96"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
    </svg>
  );
}

export function CtaSection({ authorsCount = 0 }: CtaSectionProps) {
  return (
    <>
      {/* ── Community block ─────────────────────────────────────────────── */}
      <section className="border-t border-border-default bg-bg-elevated relative overflow-hidden">
        {/* Faint grid overlay */}
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        {/* Centered accent lines */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border-default to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          {/* Header — centered */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-xs text-accent tracking-widest uppercase">
                Join the community
              </span>
              <div className="h-px w-8 bg-accent" />
            </div>
            <h2 className="font-raleway font-black text-4xl md:text-5xl text-text-primary mb-3">
              Build with others.
            </h2>
            <p className="font-raleway text-text-dim max-w-lg mx-auto">
              {authorsCount > 0
                ? `Join ${authorsCount} developer${authorsCount > 1 ? "s" : ""} already building Pumpkin plugins. Ask questions, share ideas, contribute code.`
                : "Ask questions, share your plugins, and contribute to the Pumpkin ecosystem."}
            </p>
          </div>

          {/* Platform cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* Discord */}
            <a
              href="https://discord.gg/NwrKApx7p8"
              target="_blank"
              rel="noopener noreferrer"
              className="group border-t-[3px] border-t-[#5865F2] border border-[#5865F2]/20 bg-[#5865F2]/5 hover:bg-[#5865F2]/10 hover:border-[#5865F2]/40 transition-colors p-8 flex flex-col items-center text-center gap-5"
            >
              <DiscordLogo className="w-10 h-10 text-[#5865F2]" />
              <div>
                <div className="font-raleway font-black text-xl text-text-primary mb-1">
                  Discord
                </div>
                <div className="font-mono text-xs text-text-dim leading-relaxed">
                  Chat in real-time with the community, get help, and share your projects.
                </div>
              </div>
              <span className="font-mono text-xs text-[#7289da] group-hover:text-[#5865F2] transition-colors flex items-center gap-1.5 mt-auto">
                Join the server <ArrowRight className="w-3 h-3" />
              </span>
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/FabLrc/pumpkin-hub"
              target="_blank"
              rel="noopener noreferrer"
              className="group border-t-[3px] border-t-white/30 border border-border-default bg-bg-surface/40 hover:bg-bg-surface hover:border-border-hover transition-colors p-8 flex flex-col items-center text-center gap-5"
            >
              <GitHubLogo className="w-10 h-10 text-text-primary" />
              <div>
                <div className="font-raleway font-black text-xl text-text-primary mb-1">
                  GitHub
                </div>
                <div className="font-mono text-xs text-text-dim leading-relaxed">
                  Browse the source, open issues, contribute features, and follow releases.
                </div>
              </div>
              <span className="font-mono text-xs text-text-subtle group-hover:text-accent transition-colors flex items-center gap-1.5 mt-auto">
                View repository <ArrowRight className="w-3 h-3" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Get started block ────────────────────────────────────────────── */}
      <section className="border-t border-border-default grid-bg relative overflow-hidden">
        <div className="cta-glow pointer-events-none absolute -top-24 -right-24 w-96 h-96 opacity-20" />
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
    </>
  );
}
