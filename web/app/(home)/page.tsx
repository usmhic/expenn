import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

const description =
  "Free, open-source expense tracking for individuals, families and organisations. Snap receipts, save flights and hotels, see what every trip costs per person, and approve and reimburse team spending. Self-hosted with Docker Compose.";

export const metadata: Metadata = {
  title: { absolute: "Expenn: open-source receipt, trip and expense tracking" },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Expenn",
    title: "Expenn: open-source receipt, trip and expense tracking",
    description,
    images: [{ url: "/social-card.png", width: 1200, height: 630, alt: "Expenn" }],
  },
};

export default function Page() {
  return <LandingPage />;
}
