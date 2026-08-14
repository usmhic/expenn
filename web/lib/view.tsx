import { createContext, useContext, useState, type ReactNode } from "react";

export type View = "traveler" | "admin";

const ViewCtx = createContext<{ view: View; setView: (v: View) => void } | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("traveler");
  return <ViewCtx.Provider value={{ view, setView }}>{children}</ViewCtx.Provider>;
}

export function useView() {
  const c = useContext(ViewCtx);
  if (!c) throw new Error("useView must be used within ViewProvider");
  return c;
}
