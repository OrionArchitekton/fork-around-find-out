/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The sponsor SDKs are only imported inside server route handlers.
  serverExternalPackages: ["@daytonaio/sdk", "braintrust"],
};

export default nextConfig;
