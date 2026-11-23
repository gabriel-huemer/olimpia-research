/** @type {import('next').NextConfig} */
const protecao = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
];

const nextConfig = {
  reactStrictMode: true,
  output: process.env.NEXT_STANDALONE ? "standalone" : undefined,
  async headers() {
    return [
      { source: "/:path*", headers: protecao },
      // Só a página pública pode ser incorporada em outro site (RF21).
      { source: "/((?!publico$).*)", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'self'" }] },
    ];
  },
};

export default nextConfig;
