import { ArrowRight, Boxes, Wrench } from "lucide-react";
import { Button } from "@/components/ui";

export function ServerBuilderSpotlight() {
  return (
    <section className="border-t border-border-default bg-bg-elevated/30">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
          <article className="border border-border-default bg-bg-elevated p-8">
            <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/10 px-3 py-1 mb-5">
              <Wrench className="w-3.5 h-3.5 text-accent" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
                Flagship Feature
              </span>
            </div>

            <h2 className="font-raleway font-black text-3xl md:text-4xl text-text-primary leading-tight">
              Server Builder
            </h2>
            <p className="font-raleway text-text-subtle mt-3 max-w-2xl leading-relaxed">
              Configure ready-to-run Pumpkin servers in minutes: pick plugins,
              resolve dependencies, generate portable bundles, and share reproducible builds.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button href="/server-builder" className="text-sm px-5 py-3">
                Launch Server Builder
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                href="/dashboard/server-builder"
                className="text-sm px-5 py-3"
              >
                View Saved Builds
              </Button>
            </div>
          </article>

          <aside className="border border-border-default bg-bg-surface p-6">
            <div className="flex items-center gap-2 mb-4">
              <Boxes className="w-4 h-4 text-accent" />
              <h3 className="font-mono text-xs text-text-muted uppercase tracking-widest">
                Build Workflow
              </h3>
            </div>

            <ol className="space-y-3">
              <li className="border border-border-default px-3 py-2">
                <p className="font-mono text-[11px] text-text-primary uppercase tracking-wider">
                  01 Select plugins
                </p>
                <p className="font-raleway text-xs text-text-dim mt-1">
                  Start from catalog or from a plugin page.
                </p>
              </li>
              <li className="border border-border-default px-3 py-2">
                <p className="font-mono text-[11px] text-text-primary uppercase tracking-wider">
                  02 Validate stack
                </p>
                <p className="font-raleway text-xs text-text-dim mt-1">
                  Resolve dependency graph and platform compatibility.
                </p>
              </li>
              <li className="border border-border-default px-3 py-2">
                <p className="font-mono text-[11px] text-text-primary uppercase tracking-wider">
                  03 Share build
                </p>
                <p className="font-raleway text-xs text-text-dim mt-1">
                  Save, download, or publish a share link instantly.
                </p>
              </li>
            </ol>
          </aside>
        </div>
      </div>
    </section>
  );
}
