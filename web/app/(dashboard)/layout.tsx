import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  try {
    await apiClient({ cookie: (await cookies()).toString() }).auth.me();
  } catch {
    redirect("/login?error=session-required");
  }

  return children;
}
