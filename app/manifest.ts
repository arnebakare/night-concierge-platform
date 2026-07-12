import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Night Concierge Platform",
    short_name: "Concierge",
    description: "VIP nightlife requests and guestlist operations.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b"
  };
}
