const SUPABASE_ORIGIN = "https://lljkbvhknqtzhrucncfn.supabase.co";

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `img-src 'self' data: blob: https://cdn.prod.website-files.com ${SUPABASE_ORIGIN}`,
  "media-src 'self' https://d8j0ntlcm91z4.cloudfront.net",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Next.js needs 'unsafe-inline' for its bootstrap scripts without nonce wiring; tightened
  // further (nonce-based CSP) is a follow-up hardening step, not required for the current risk level.
  "script-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${SUPABASE_ORIGIN} https://accounts.google.com`,
  "frame-src https://accounts.google.com",
  "form-action 'self' https://accounts.google.com",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: CSP },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output produces a minimal, self-contained server bundle —
  // what the Dockerfile copies into the runtime image for self-hosted
  // deployments (no need to ship node_modules or the full source tree).
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "d8j0ntlcm91z4.cloudfront.net" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
