"use client";

import { useEffect, useState } from "react";
import { getLandingAccountStateAction } from "@/app/actions";
import { FeatureSections } from "./features";
import { SiteFooter } from "./footer";
import { SiteHeader } from "./header";
import { Hero, HowItWorks } from "./hero";
import { LandingProviders } from "./landing-providers";
import type { LandingAccountState } from "./links";
import { FaqSection, FinalCta, SecuritySection, SelfHostSection } from "./sections";
import { TripsSection } from "./trips";

function Landing() {
  const [account, setAccount] = useState<LandingAccountState>({ signedIn: false });

  useEffect(() => {
    let active = true;
    getLandingAccountStateAction()
      .then((state) => {
        if (active) setAccount(state);
      })
      .catch(() => {
        if (active) setAccount({ signedIn: false });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="lp flex min-h-screen flex-col overflow-x-clip bg-canvas">
      <SiteHeader account={account} />
      <main className="flex-1">
        <Hero account={account} />
        <HowItWorks />
        <TripsSection />
        <FeatureSections />
        <SecuritySection />
        <SelfHostSection />
        <FaqSection />
        <FinalCta account={account} />
      </main>
      <SiteFooter />
    </div>
  );
}

export function LandingPage() {
  return (
    <LandingProviders>
      <Landing />
    </LandingProviders>
  );
}
