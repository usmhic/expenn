'use client';

import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { ViewProvider } from "@/lib/view";

export function LandingProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ViewProvider>{children}</ViewProvider>
    </I18nProvider>
  );
}
