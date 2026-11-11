import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that apply when you use Expenn.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return <LegalPage doc="terms" />;
}
