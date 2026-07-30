"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createAnnouncement,
  updateAnnouncement,
  type AnnouncementActionState,
} from "@/app/admin/annonces/actions";
import { roleLabel } from "@/lib/role-labels";
import { reseauOptionsWithLegacy } from "@/lib/reseau-options";
import { AnnouncementMediaItem } from "@/components/announcement-media-item";
import { AnnouncementPreview } from "@/components/announcement-preview";

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
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const action = announcement ? updateAnnouncement.bind(null, announcement.id) : createAnnouncement;
  const [state, formAction, pending] = useActionState(action, initialState);
  const rows = [1, 2, 3].map((i) => announcement?.targets[i - 1] ?? null);

  // État dupliqué uniquement pour l'aperçu (le formulaire lui-même reste non
  // contrôlé — envoi via FormData, pas via ces states) : titre/message tapés
  // + fichiers médias fraîchement sélectionnés (pas encore envoyés).
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [newMediaPreviews, setNewMediaPreviews] = useState<{ type: string; url: string }[]>([]);

  useEffect(() => {
    return () => {
      newMediaPreviews.forEach((m) => URL.revokeObjectURL(m.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newMediaPreviews]);

  function handleMediaChange(e: ChangeEvent<HTMLInputElement>) {
    newMediaPreviews.forEach((m) => URL.revokeObjectURL(m.url));
    const files = Array.from(e.target.files ?? []);
    setNewMediaPreviews(
      files.map((file) => ({
        type: file.type.startsWith("image/")
          ? "IMAGE"
          : file.type.startsWith("video/")
            ? "VIDEO"
            : "AUDIO",
        url: URL.createObjectURL(file),
      }))
    );
  }

  function handleCancel() {
    if (announcement) {
      // En édition, "Annuler" abandonne les modifications et revient à la liste.
      router.push("/admin/annonces");
      return;
    }
    // En création, le formulaire vit sur la même page que la liste : on le
    // vide simplement plutôt que de naviguer (il n'y a nulle part où revenir).
    formRef.current?.reset();
    newMediaPreviews.forEach((m) => URL.revokeObjectURL(m.url));
    setTitle("");
    setBody("");
    setNewMediaPreviews([]);
  }

  return (
    <form ref={formRef} action={formAction} className="card space-y-5 p-6" encType="multipart/form-data">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Titre
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={announcement?.title}
          onChange={(e) => setTitle(e.target.value)}
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
          onChange={(e) => setBody(e.target.value)}
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
                <select
                  name={`reseau${i}`}
                  defaultValue={row?.reseau ?? ""}
                  className="input-field text-xs"
                >
                  <option value="">Tous réseaux</option>
                  {reseauOptionsWithLegacy(row?.reseau ?? "").map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
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
          onChange={handleMediaChange}
          className="input-field mt-1.5 text-xs"
        />
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">30 Mo maximum par fichier.</p>
      </div>

      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Aperçu — ce que verront les utilisateurs concernés
        </span>
        <div className="mt-2">
          <AnnouncementPreview
            title={title}
            body={body}
            existingMedia={announcement?.media ?? []}
            newMediaPreviews={newMediaPreviews}
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Enregistrement..." : announcement ? "Enregistrer les modifications" : "Publier l'annonce"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-100 disabled:opacity-60 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
