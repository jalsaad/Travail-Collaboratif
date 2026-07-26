"use client";

import { useTransition } from "react";
import Link from "next/link";
import { deleteAnnouncement, republishAnnouncement } from "@/app/admin/annonces/actions";

export function AnnouncementRowActions({ announcementId }: { announcementId: string }) {
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Supprimer définitivement cette annonce ?")) return;
    startTransition(() => {
      deleteAnnouncement(announcementId);
    });
  }

  function republish() {
    startTransition(() => {
      republishAnnouncement(announcementId);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/annonces/${announcementId}/modifier`}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        Modifier
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={republish}
        className="rounded-md border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60 dark:border-brand-800 dark:text-brand-400 dark:hover:bg-stone-800"
      >
        {pending ? "..." : "Republier"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        {pending ? "..." : "Supprimer"}
      </button>
    </div>
  );
}
