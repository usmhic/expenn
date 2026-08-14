export function roleHome(role: string, workspaceSlug = "workspace") {
  const appRole = ["owner", "admin", "manager"].includes(role) ? "admin" : "traveler";
  return `/${workspaceSlug}/${appRole}`;
}
