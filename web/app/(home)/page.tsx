import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

const description =
  "Free, open-source expense and travel management for teams. Plan multi-stop trips on a map, capture receipts in seconds, and approve and reimburse from one queue, self-hosted with Docker Compose.";

export const metadata: Metadata = {
  title: { absolute: "Expenn: open-source expense and travel management for teams" },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Expenn",
    title: "Expenn: open-source expense and travel management for teams",
    description,
    images: [{ url: "/social-card.png", width: 1200, height: 630, alt: "Expenn" }],
  },
};

export default function Page() {
  return <LandingPage />;
}
