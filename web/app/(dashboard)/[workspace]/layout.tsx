import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSignedInState } from "@/server/auth-redirect";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const [{ workspace }, state] = await Promise.all([params, getSignedInState(await headers())]);
  if (!state) redirect("/onboarding");
  if (workspace !== state.workspaceSlug) redirect(state.redirectTo);
  return children;
}
