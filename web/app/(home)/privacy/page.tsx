import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Expenn collects, uses and protects your data.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <LegalPage doc="privacy" />;
}
