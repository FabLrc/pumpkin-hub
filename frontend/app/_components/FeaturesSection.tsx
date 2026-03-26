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
              Native Performance
            </h3>
            <p className="font-raleway text-sm text-text-dim leading-relaxed mb-6">
              Plugins compile to native binaries (.dll / .so / .dylib) and run
              directly inside Pumpkin MC — a high-performance Minecraft server
              written in Rust. No JVM, no interpreter, no overhead.
            </p>
            <div className="space-y-2 border-t border-border-default pt-6">
              {[
                { label: "Plugin format", value: ".dll / .so / .dylib" },
                { label: "Server runtime", value: "Rust / Tokio" },
                { label: "API backend", value: "Axum 0.8 async" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="font-mono text-xs text-text-dim">
                    {label}
                  </span>
                  <span className="font-mono text-xs text-text-primary">
                    {value}
                  </span>
                </div>
              ))}
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
              Every published release is SHA-256 hashed. Download the checksum
              alongside any binary and verify integrity before deploying to your
              server.
            </p>
            <div className="border border-border-default bg-bg-elevated p-3 mt-auto">
              <div className="font-mono text-[10px] text-text-dim mb-2">
                # Checksum displayed on every release
              </div>
              <div className="font-mono text-[11px] text-text-muted break-all">
                <span className="text-text-dim">sha256: </span>
                <span className="text-text-primary">a3f8c2…d94e1b</span>
                <br />
                <span className="text-success">&nbsp;&nbsp;✓ integrity guaranteed</span>
              </div>
            </div>
          </div>

          {/* Pillar 3: Cross-Platform */}
          <div className="p-8">
            <div className="w-10 h-10 bg-bg-elevated border border-border-default flex items-center justify-center mb-6">
              <Cpu className="text-accent w-[18px] h-[18px]" />
            </div>
            <h3 className="font-raleway font-black text-xl text-text-primary mb-3">
              Cross-Platform
            </h3>
            <p className="font-raleway text-sm text-text-dim leading-relaxed mb-6">
              Publish separate binaries for each OS. Every plugin page lists
              supported platforms so server admins always download the right
              binary for their environment.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Windows", ext: ".dll", color: "text-success" },
                { label: "Linux", ext: ".so", color: "text-success" },
                { label: "macOS", ext: ".dylib", color: "text-success" },
                { label: "GitHub CI", ext: "auto-publish", color: "text-accent" },
              ].map(({ label, ext, color }) => (
                <div key={label} className="border border-border-default p-2 text-center">
                  <div className="font-mono text-[10px] text-text-primary mb-0.5">
                    {label}
                  </div>
                  <div className={`font-mono text-[10px] ${color}`}>
                    {ext}
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
