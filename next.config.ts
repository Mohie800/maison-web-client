import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// Dev and production media hosts, plus whatever the build's env points at.
function mediaHosts() {
  const hosts = new Set(["maison.dockbox.cloud", "api.maisonsale.com.sa"]);
  for (const url of [
    process.env.NEXT_PUBLIC_MEDIA_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ]) {
    try {
      if (url) hosts.add(new URL(url).hostname);
    } catch {}
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  images: {
    /**
     * The API returns relative media paths (e.g. "/uploads/listings/….jpg")
     * served from the application origin. Without this, every listing photo
     * bypasses next/image and ships unoptimised.
     * See plans/06 G12 — a CDN migration is an open question for the backend.
     */
    remotePatterns: mediaHosts().map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/uploads/**",
    })),
  },
};

export default withNextIntl(nextConfig);
