import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

function validateApiBaseUrl(value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be an absolute HTTP(S) origin.",
    );
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be an absolute HTTP(S) origin.",
    );
  }
}

const nextConfig = (phase: string): NextConfig => {
  const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (phase === PHASE_PRODUCTION_BUILD && !configuredApiBaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is required for production builds.",
    );
  }
  if (configuredApiBaseUrl) {
    validateApiBaseUrl(configuredApiBaseUrl);
  }

  return {
    reactStrictMode: true,
    poweredByHeader: false,
    async headers() {
      return [
        {
          source: "/:path*",
          headers: securityHeaders,
        },
      ];
    },
  };
};

export default nextConfig;
