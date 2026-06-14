import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iMemory",
    short_name: "iMemory",
    description:
      "La tua memoria digitale intelligente: memorie, goals, focus, chat AI e mappa mentale.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#09090b",
    categories: ["productivity", "utilities", "education"],
    lang: "it",
    icons: [
      {
        src: "/vector.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/vector.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/vector.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
