"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const messages: Record<string, { type: "success" | "error"; text: string }> = {
  created: { type: "success", text: "Created successfully." },
  folderCreated: { type: "success", text: "Folder created." },
  folderRenamed: { type: "success", text: "Folder renamed." },
  "folder-name-required": { type: "error", text: "Folder name is required." },
  "folder-update-failed": { type: "error", text: "Folder update failed." },
  "admin-required": { type: "error", text: "Admin access is required for that page." },
  "session-required": { type: "error", text: "Please sign in to continue." },
};

export function RouteToasts() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    for (const [key, value] of searchParams.entries()) {
      const message = messages[value] ?? messages[key];
      if (!message) continue;
      toast[message.type](message.text);
      break;
    }
  }, [pathname, searchParams]);

  return null;
}
