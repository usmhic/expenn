import { redirect } from "next/navigation";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  redirect(invite ? `/login?invite=${encodeURIComponent(invite)}` : "/login");
}
