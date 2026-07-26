"use client";

import { useTransition } from "react";
import { dismissAnnouncement } from "@/app/(app)/actions";

export function AnnouncementDismissButton({ announcementId }: { announcementId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => dismissAnnouncement(announcementId))}
      aria-label="Fermer cette annonce"
      className="shrink-0 rounded-full px-2 py-0.5 text-brand-700/70 transition hover:bg-brand-100 hover:text-brand-800 disabled:opacity-60"
    >
      ×
    </button>
  );
}
