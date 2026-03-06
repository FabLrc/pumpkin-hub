import { Zap, Fingerprint, Cpu } from "lucide-react";

export function FeaturesSection() {
  return (
    <section className="border-t border-border-default bg-bg-elevated/40">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-center gap-3 mb-12">
          <div className="h-px w-8 bg-accent" />
          <span className="font-mono text-xs text-accent tracking-widest uppercase">
            Why Pumpkin Hub
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border-default">
          {/* Pillar 1: Performance */}
          <div className="p-8 border-b md:border-b-0 md:border-r border-border-default">
            <div className="w-10 h-10 bg-bg-elevated border border-border-default flex items-center justify-center mb-6">
              <Zap className="text-accent w-[18px] h-[18px]" />
            </div>
            <h3 className="font-raleway font-black text-xl text-text-primary mb-3">
              Zero-Cost Abstractions
            </h3>
            <p className="font-raleway text-sm text-text-dim leading-relaxed mb-6">
              Every plugin in this registry is compiled to native machine code.
              No JVM warmup, no bytecode interpretation — just blazing-fast
              execution from first tick.
            </p>
            <div className="space-y-2 border-t border-border-default pt-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-text-dim">
                  Tick time (avg)
                </span>
                <span className="font-mono text-xs text-text-primary">
                  0.8ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-text-dim">
                  vs Paper MC
                </span>
                <span className="font-mono text-xs text-success">
                  12x faster
                </span>
              </div>
              <div className="w-full bg-bg-surface h-1 mt-3">
                <div className="bg-accent h-1 w-11/12" />
              </div>
            </div>
          </div>

          {/* Pillar 2: Security */}
          <div className="p-8 border-b md:border-b-0 md:border-r border-border-default">
            <div className="w-10 h-10 bg-bg-elevated border border-border-default flex items-center justify-center mb-6">
              <Fingerprint className="text-accent w-[18px] h-[18px]" />
            </div>
            <h3 className="font-raleway font-black text-xl text-text-primary mb-3">
              Binary Verification
            </h3>
            <p className="font-raleway text-sm text-text-dim leading-relaxed mb-6">
              Every release is SHA-256 hashed and stored immutably. Our
              automated pipeline scans for unsafe blocks and memory
              vulnerabilities before a plugin is ever published.
            </p>
            <div className="border border-border-default bg-bg-elevated p-3 mt-auto">
              <div className="font-mono text-[10px] text-text-dim mb-2">
                # Verify a download
              </div>
              <div className="font-mono text-[11px] text-text-muted">
                <span className="text-accent select-none">$ </span>pumpkin
                verify
                <br />
                <span className="text-text-dim">
                  &nbsp;&nbsp;--plugin guard@2.1.3
                </span>
                <br />
                <span className="text-success">
                  &nbsp;&nbsp;✓ SHA-256 match
                </span>
              </div>
            </div>
          </div>

          {/* Pillar 3: Compatibility */}
          <div className="p-8">
            <div className="w-10 h-10 bg-bg-elevated border border-border-default flex items-center justify-center mb-6">
              <Cpu className="text-accent w-[18px] h-[18px]" />
            </div>
            <h3 className="font-raleway font-black text-xl text-text-primary mb-3">
              Cross-Architecture
            </h3>
            <p className="font-raleway text-sm text-text-dim leading-relaxed mb-6">
              Rust&apos;s compile targets mean plugins ship for x86_64, aarch64,
              and RISC-V. Every plugin page lists supported architectures so you
              never ship a broken binary.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { arch: "x86_64", status: "✓ Supported", color: "text-success" },
                { arch: "aarch64", status: "✓ Supported", color: "text-success" },
                { arch: "RISC-V", status: "~ Experimental", color: "text-warning" },
                { arch: "WASM", status: "~ Experimental", color: "text-warning" },
              ].map(({ arch, status, color }) => (
                <div key={arch} className="border border-border-default p-2 text-center">
                  <div className="font-mono text-[10px] text-text-primary mb-0.5">
                    {arch}
                  </div>
                  <div className={`font-mono text-[10px] ${color}`}>
                    {status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
