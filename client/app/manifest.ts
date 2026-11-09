import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "1C Outdoor Advertising Asset Management",
    short_name: "1C Assets",
    description: "Billboard asset records, QR labels and maintenance.",
    start_url: "/workspace",
    scope: "/",
    display: "standalone",
    background_color: "#4a4949",
    theme_color: "#ff6b00",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
