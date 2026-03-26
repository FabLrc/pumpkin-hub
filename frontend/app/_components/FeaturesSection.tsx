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
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-text-dim">Tick time (avg)</span>
                <span className="text-text-primary font-bold">0.8ms</span>
              </div>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-text-dim">vs Paper MC</span>
                <span className="text-accent font-bold">12x faster</span>
              </div>
              <div className="h-1.5 bg-bg-surface mt-2">
                <div className="h-full bg-accent" style={{ width: "92%" }} />
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
              Every release is SHA-256 hashed and stored immutably. Our automated
              pipeline scans for unsafe blocks and memory vulnerabilities before a
              plugin is ever published.
            </p>
            <div className="border border-border-default bg-bg-elevated p-3 mt-auto">
              <div className="font-mono text-[10px] text-text-dim mb-2">
                # Verify a download
              </div>
              <div className="font-mono text-[11px] text-text-muted break-all">
                <span className="text-accent">$ pumpkin verify</span>
                <br />
                <span className="text-text-dim">&nbsp;&nbsp;--plugin guard@2.1.3</span>
                <br />
                <span className="text-success">&nbsp;&nbsp;✓ SHA-256 match</span>
              </div>
            </div>
          </div>

          {/* Pillar 3: Cross-Architecture */}
          <div className="p-8">
            <div className="w-10 h-10 bg-bg-elevated border border-border-default flex items-center justify-center mb-6">
              <Cpu className="text-accent w-[18px] h-[18px]" />
            </div>
            <h3 className="font-raleway font-black text-xl text-text-primary mb-3">
              Cross-Architecture
            </h3>
            <p className="font-raleway text-sm text-text-dim leading-relaxed mb-6">
              Rust's compile targets mean plugins ship for x86_64, aarch64, and
              RISC-V. Every plugin page lists supported architectures so you never
              ship a broken binary.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "x86_64", status: "Supported", color: "text-success" },
                { label: "aarch64", status: "Supported", color: "text-success" },
                { label: "RISC-V", status: "~ Experimental", color: "text-warning" },
                { label: "WASM", status: "~ Experimental", color: "text-warning" },
              ].map(({ label, status, color }) => (
                <div key={label} className="border border-border-default p-2 text-center">
                  <div className="font-mono text-[10px] text-text-primary mb-0.5">
                    {label}
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
