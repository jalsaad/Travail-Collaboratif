"use client";

// Rendu identique (mêmes classes) à ce que components/announcement-banner.tsx
// affiche réellement aux utilisateurs — garde les deux en phase si le style
// de la bannière change un jour.
type PreviewMedia = { id?: string; type: string; url: string };

export function AnnouncementPreview({
  title,
  body,
  existingMedia,
  newMediaPreviews,
}: {
  title: string;
  body: string;
  existingMedia: PreviewMedia[];
  newMediaPreviews: PreviewMedia[];
}) {
  const media = [...existingMedia, ...newMediaPreviews];
  const hasContent = title.trim().length > 0 || body.trim().length > 0;

  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900/50">
      {!hasContent ? (
        <p className="text-sm italic text-stone-400 dark:text-stone-500">
          L&apos;aperçu s&apos;affichera ici au fur et à mesure de la saisie.
        </p>
      ) : (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 dark:border-brand-800 dark:bg-brand-950/40">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-brand-800 dark:text-brand-300">
              {title || "Titre de l'annonce"}
            </p>
            <p className="mt-0.5 text-sm text-brand-700/90 dark:text-brand-400">
              {body || "Message de l'annonce"}
            </p>
            {media.length > 0 && (
              <div className="mt-2.5 space-y-2.5">
                {media.map((m, i) => {
                  const key = m.id ?? `${m.type}-${i}`;
                  if (m.type === "IMAGE") {
                    // eslint-disable-next-line @next/next/no-img-element
                    return (
                      <img
                        key={key}
                        src={m.url}
                        alt=""
                        className="max-h-64 w-auto rounded-lg border border-brand-100"
                      />
                    );
                  }
                  if (m.type === "VIDEO") {
                    return (
                      <video
                        key={key}
                        src={m.url}
                        controls
                        className="max-h-64 w-full rounded-lg border border-brand-100"
                      />
                    );
                  }
                  return <audio key={key} src={m.url} controls className="w-full" />;
                })}
              </div>
            )}
          </div>
          <span
            aria-hidden="true"
            className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300"
          >
            Aperçu
          </span>
        </div>
      )}
    </div>
  );
}
