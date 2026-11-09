import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SorakSora! — The Cheer Wall",
    short_name: "SorakSora",
    description:
      "SorakSora — The Cheer Wall: papan sorak Neobrutalist real-time yang mengantarkan dukungan penonton langsung ke panggung, layar, dan smartwatch.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF9F5",
    theme_color: "#FAF9F5",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
