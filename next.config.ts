import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    /**
     * The API returns relative media paths (e.g. "/uploads/listings/….jpg")
     * served from the application origin. Without this, every listing photo
     * bypasses next/image and ships unoptimised.
     * See plans/06 G12 — a CDN migration is an open question for the backend.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "maison.dockbox.cloud",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
