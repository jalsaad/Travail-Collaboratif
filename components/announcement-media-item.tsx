"use client";

import { useTransition } from "react";
import { deleteAnnouncementMediaItem } from "@/app/admin/annonces/actions";

const mediaIcon: Record<string, string> = { IMAGE: "🖼️", VIDEO: "🎬", AUDIO: "🔊" };

export function AnnouncementMediaItem({ id, type, url }: { id: string; type: string; url: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-300">
      <span>
        {mediaIcon[type] ?? "📎"} {url.split("/").pop()}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Retirer ce média de l'annonce ?")) return;
          startTransition(() => {
            deleteAnnouncementMediaItem(id);
          });
        }}
        className="font-medium text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
      >
        {pending ? "..." : "Retirer"}
      </button>
    </li>
  );
}
