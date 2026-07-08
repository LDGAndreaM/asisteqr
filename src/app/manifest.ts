import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AsisteQR",
    short_name: "AsisteQR",
    description: "Asistencia por código QR con validación de ubicación",
    start_url: "/student",
    display: "standalone",
    background_color: "#eceafc",
    theme_color: "#2f6bff",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
