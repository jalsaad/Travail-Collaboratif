"use client";

import { useActionState } from "react";
import {
  createAnnouncement,
  updateAnnouncement,
  type AnnouncementActionState,
} from "@/app/admin/annonces/actions";
import { roleLabel } from "@/lib/role-labels";
import { AnnouncementMediaItem } from "@/components/announcement-media-item";

const initialState: AnnouncementActionState = {};

const roleOptions = [
  { value: "", label: "Tous les rôles" },
  { value: "DIRECTION", label: roleLabel.DIRECTION },
  { value: "REFERENT_NUMERIQUE", label: roleLabel.REFERENT_NUMERIQUE },
  { value: "ENSEIGNANT", label: roleLabel.ENSEIGNANT },
];

type TargetRow = { role: string | null; schoolId: string | null; reseau: string | null; disciplineId: string | null };
type ExistingMedia = { id: string; type: string; url: string };

export function AnnouncementForm({
  schools,
  disciplines,
  announcement,
}: {
  schools: { id: string; name: string }[];
  disciplines: { id: string; name: string }[];
  announcement?: {
    id: string;
    title: string;
    body: string;
    targets: TargetRow[];
    media: ExistingMedia[];
  };
}) {
  const action = announcement ? updateAnnouncement.bind(null, announcement.id) : createAnnouncement;
  const [state, formAction, pending] = useActionState(action, initialState);
  const rows = [1, 2, 3].map((i) => announcement?.targets[i - 1] ?? null);

  return (
    <form action={formAction} className="card space-y-5 p-6" encType="multipart/form-data">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Titre
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={announcement?.title}
          className="input-field mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Message
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={3}
          defaultValue={announcement?.body}
          className="input-field mt-1.5"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Ciblage — chaque ligne combine ses critères en ET, les lignes se combinent en OU
        </span>
        <div className="mt-2 space-y-2">
          {[1, 2, 3].map((i) => {
            const row = rows[i - 1];
            return (
              <div key={i} className="grid grid-cols-4 gap-2 rounded-lg border border-stone-200 bg-stone-50/50 p-2.5 dark:border-stone-700 dark:bg-stone-800/50">
                <select name={`role${i}`} defaultValue={row?.role ?? ""} className="input-field text-xs">
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <select name={`schoolId${i}`} defaultValue={row?.schoolId ?? ""} className="input-field text-xs">
                  <option value="">Toutes les écoles</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  name={`reseau${i}`}
                  placeholder="Réseau (ex: WBE)"
                  defaultValue={row?.reseau ?? ""}
                  className="input-field text-xs"
                />
                <select
                  name={`disciplineId${i}`}
                  defaultValue={row?.disciplineId ?? ""}
                  className="input-field text-xs"
                >
                  <option value="">Toutes disciplines</option>
                  {disciplines.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {announcement && announcement.media.length > 0 && (
        <div>
          <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">Médias déjà attachés</span>
          <ul className="mt-2 space-y-1.5">
            {announcement.media.map((m) => (
              <AnnouncementMediaItem key={m.id} id={m.id} type={m.type} url={m.url} />
            ))}
          </ul>
        </div>
      )}

      <div>
        <label htmlFor="media" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Ajouter des médias (images, vidéos, audio)
        </label>
        <input
          id="media"
          name="media"
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="input-field mt-1.5 text-xs"
        />
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">30 Mo maximum par fichier.</p>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Enregistrement..." : announcement ? "Enregistrer les modifications" : "Publier l'annonce"}
      </button>
    </form>
  );
}
