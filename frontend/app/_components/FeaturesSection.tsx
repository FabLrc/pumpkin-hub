import { Zap, HardDrive, Cpu, Users, Package, GitBranch, FileCode } from "lucide-react";

const pumpkinStats = [
  {
    icon: Zap,
    label: "Instant Startup",
    value: "~5ms",
    desc: "1000x faster than Vanilla",
  },
  {
    icon: HardDrive,
    label: "Memory Usage",
    value: "~100MB",
    desc: "vs 1.8GB Vanilla",
  },
  {
    icon: Cpu,
    label: "Multi-threaded",
    value: "All Cores",
    desc: "CPU-optimized engine",
  },
  {
    icon: Users,
    label: "Cross-Play",
    value: "Java + Bedrock",
    desc: "Built-in, no plugins",
  },
];

const serverAdminFeatures = [
  {
    icon: Package,
    title: "Server Builder",
    description:
      "Configure a ready-to-launch server stack in minutes. Pick plugins, resolve dependencies automatically, download a portable .zip with Pumpkin and all .wasm files. Share builds via tokenized links.",
  },
  {
    icon: GitBranch,
    title: "GitHub Auto-Publishing",
    description:
      "Publish a plugin from a GitHub repository in two clicks. Every GitHub Release creates a new version automatically. README and changelog stay in sync. Dynamic badge for your repository.",
  },
  {
    icon: FileCode,
    title: "WASM Everywhere",
    description:
      "A single .wasm binary runs on Windows, macOS, and Linux. No more platform-specific builds. Every binary is SHA-256 hashed and automatically scanned for vulnerabilities before publication.",
  },
];

const comparisonData = [
  {
    metric: "Startup",
    values: [
      { label: "~5ms", best: true, raw: 5 },
      { label: "~10s", best: false, raw: 10000 },
      { label: "~15s", best: false, raw: 15000 },
    ],
  },
  {
    metric: "RAM",
    values: [
      { label: "~100MB", best: true, raw: 100 },
      { label: "~1.4GB", best: false, raw: 1400 },
      { label: "~1.8GB", best: false, raw: 1800 },
    ],
  },
];

const tableCols = [
  { label: "Pumpkin" },
  { label: "Paper" },
  { label: "Vanilla" },
];

export function FeaturesSection() {
  return (
    <section className="border-t border-border-default bg-bg-elevated/40">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-center gap-3 mb-16">
          <div className="h-px w-8 bg-accent" />
          <span className="font-mono text-xs text-accent tracking-widest uppercase">
            Why Pumpkin Hub
          </span>
        </div>

        {/* Zone 1: Powered by Pumpkin */}
        <div className="mb-16">
          <h2 className="font-raleway font-black text-2xl text-text-primary mb-2">
            Powered by Pumpkin
          </h2>
          <p className="font-raleway text-sm text-text-dim mb-10 max-w-2xl">
            Pumpkin Hub is built on Pumpkin MC — the world&apos;s fastest Minecraft
            server engine, written in pure Rust.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-border-default mb-10">
            {pumpkinStats.map((stat, i) => {
              const Icon = stat.icon;
              const borders = [
                "border-b border-r md:border-b-0",
                "border-b md:border-b-0 md:border-r",
                "border-r",
                "",
              ];
              return (
                <div
                  key={stat.label}
                  className={`p-7 ${borders[i]} border-border-default transition-[border-color] duration-200 hover:border-accent/50`}
                >
                  <div className="w-10 h-10 bg-bg-elevated border border-border-default flex items-center justify-center mb-4">
                    <Icon className="text-accent w-[18px] h-[18px]" />
                  </div>
                  <div className="font-raleway font-black text-3xl text-accent mb-1">
                    {stat.value}
                  </div>
                  <div className="font-raleway text-sm text-text-primary mb-0.5">
                    {stat.label}
                  </div>
                  <div className="font-raleway text-xs text-text-dim leading-relaxed">
                    {stat.desc}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border border-border-default">
            <div className="grid grid-cols-4 border-b border-border-default bg-bg-surface/50">
              <div className="p-3.5 font-mono text-xs text-text-dim uppercase tracking-wider">
                Metric
              </div>
              {tableCols.map((col, ci) => (
                <div
                  key={col.label}
                  className={`p-3.5 font-mono text-xs font-bold uppercase tracking-wider text-center ${
                    ci === 0
                      ? "text-accent border-x border-border-default"
                      : "text-text-dim border-r last:border-r-0 border-border-default"
                  }`}
                >
                  {col.label}
                </div>
              ))}
            </div>
            {comparisonData.map((row, ri) => {
              const maxRaw = Math.max(...row.values.map((v) => v.raw));
              const isLast = ri === comparisonData.length - 1;
              return (
                <div
                  key={row.metric}
                  className={`grid grid-cols-4 ${isLast ? "" : "border-b border-border-default"}`}
                >
                  <div className="p-3.5 font-raleway text-sm text-text-primary">
                    {row.metric}
                  </div>
                  {row.values.map((v, ci) => (
                    <div
                      key={v.label}
                      className={`p-3.5 text-center ${
                        ci === 0
                          ? "border-x border-border-default bg-accent/[0.02]"
                          : "border-r last:border-r-0 border-border-default"
                      }`}
                    >
                      <div className="font-mono text-xs font-bold">
                        <span className={ci === 0 ? "text-accent" : "text-text-muted"}>
                          {v.label}
                        </span>
                        {v.best && (
                          <span className="inline-flex items-center ml-1.5 px-1 py-0.5 bg-accent/10 border border-accent/30 font-mono text-[9px] text-accent uppercase tracking-wider leading-none">
                            best
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 h-1 bg-bg-surface">
                        <div
                          className="h-full bg-accent/60 transition-[width] duration-300"
                          style={{
                            width: `${Math.max(((maxRaw - v.raw) / maxRaw) * 100, 2)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Zone divider */}
        <div className="flex items-center gap-3 mb-16">
          <div className="flex-1 border-t border-border-default" />
          <div className="w-px h-4 bg-accent/40" />
          <div className="flex-1 border-t border-border-default" />
        </div>

        {/* Zone 2: Built for Server Admins */}
        <div>
          <h2 className="font-raleway font-black text-2xl text-text-primary mb-2">
            Built for Server Admins
          </h2>
          <p className="font-raleway text-sm text-text-dim mb-10 max-w-2xl">
            Everything you need to discover, manage, and distribute Pumpkin
            plugins.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border-default">
            {serverAdminFeatures.map((feature, i) => {
              const Icon = feature.icon;
              const isLast = i === serverAdminFeatures.length - 1;
              return (
                <div
                  key={feature.title}
                  className={`p-8 group transition-all duration-200 ease hover:border-accent hover:-translate-y-0.5 ${
                    isLast ? "" : "border-b md:border-b-0 md:border-r"
                  } border-border-default`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-10 h-10 bg-bg-elevated border border-border-default flex items-center justify-center group-hover:border-accent/50 transition-[border-color] duration-200">
                      <Icon className="text-accent w-[18px] h-[18px]" />
                    </div>
                    <span className="font-mono text-[11px] text-text-dim/40 font-bold select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-raleway font-black text-xl text-text-primary mb-3 group-hover:text-accent transition-colors duration-200">
                    {feature.title}
                  </h3>
                  <p className="font-raleway text-sm text-text-dim leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
