import type { NextConfig } from "next";

// Les NEXT_PUBLIC_* sont inlinés au moment de `next build`, pas à runtime.
// Ces valeurs sont fournies via ARG Docker (voir Dockerfile et docker.yml).
// Le wildcard r2.cloudflarestorage.com couvre les URLs présignées quelle
// que soit la valeur de NEXT_PUBLIC_S3_PRESIGNED_ORIGIN.
const imgSrcOrigins = [
  "https://avatars.githubusercontent.com",
  "https://github.com",
  "https://*.r2.cloudflarestorage.com",
  process.env.NEXT_PUBLIC_S3_PUBLIC_URL,
  process.env.NEXT_PUBLIC_S3_PRESIGNED_ORIGIN,
]
  .filter(Boolean)
  .join(" ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${imgSrcOrigins}`,
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "media-src 'none'",
      "object-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const remotePatterns: NonNullable<
  NextConfig["images"]
>["remotePatterns"] = [
  { protocol: "https", hostname: "avatars.githubusercontent.com" },
  { protocol: "https", hostname: "github.com" },
  // Couvre les URLs présignées R2 (bucket.accountid.r2.cloudflarestorage.com)
  { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
];

if (process.env.NEXT_PUBLIC_S3_PUBLIC_URL) {
  try {
    const { protocol, hostname } = new URL(
      process.env.NEXT_PUBLIC_S3_PUBLIC_URL
    );
    remotePatterns.push({
      protocol: protocol.replace(":", "") as "https" | "http",
      hostname,
    });
  } catch {
    // URL invalide, ignorée
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = { poll: 1000, aggregateTimeout: 300 };
    }
    return config;
  },
  images: {
    remotePatterns,
  },
  redirects: async () => [
    {
      source: "/configurator",
      destination: "/server-builder",
      permanent: true,
    },
    {
      source: "/configurator/:path*",
      destination: "/server-builder/:path*",
      permanent: true,
    },
    {
      source: "/dashboard/configurator",
      destination: "/dashboard/server-builder",
      permanent: true,
    },
    {
      source: "/dashboard/configurator/:path*",
      destination: "/dashboard/server-builder/:path*",
      permanent: true,
    },
  ],
  headers: async () => [{ source: "/(.*)", headers: securityHeaders }],
};

export default nextConfig;
