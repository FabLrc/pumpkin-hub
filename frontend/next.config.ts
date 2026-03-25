import type { NextConfig } from "next";

const staticSecurityHeaders = [
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
];

function buildSecurityHeaders() {
  const imgSrcExtra = [
    process.env.NEXT_PUBLIC_S3_PUBLIC_URL,
    process.env.NEXT_PUBLIC_S3_PRESIGNED_ORIGIN,
  ]
    .filter(Boolean)
    .map((u) => ` ${u}`)
    .join("");

  return [
    ...staticSecurityHeaders,
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        `img-src 'self' data: blob: https://avatars.githubusercontent.com https://github.com${imgSrcExtra}`,
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
}

function buildRemotePatterns() {
  const patterns: { protocol: "https" | "http"; hostname: string }[] = [
    { protocol: "https", hostname: "avatars.githubusercontent.com" },
    { protocol: "https", hostname: "github.com" },
  ];

  const publicUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
  if (publicUrl) {
    try {
      const { protocol, hostname } = new URL(publicUrl);
      patterns.push({
        protocol: protocol.replace(":", "") as "https" | "http",
        hostname,
      });
    } catch {
      // invalid URL, skip
    }
  }

  const presignedOrigin = process.env.NEXT_PUBLIC_S3_PRESIGNED_ORIGIN;
  if (presignedOrigin) {
    try {
      const { protocol, hostname } = new URL(presignedOrigin);
      patterns.push({
        protocol: protocol.replace(":", "") as "https" | "http",
        hostname,
      });
    } catch {
      // invalid URL, skip
    }
  }

  return patterns;
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
    remotePatterns: buildRemotePatterns(),
  },
  headers: async () => [
    { source: "/(.*)", headers: buildSecurityHeaders() },
  ],
};

export default nextConfig;
