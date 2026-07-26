import { getVisibleAnnouncementsForUser } from "@/lib/announcements";
import type { ActiveMembership } from "@/lib/active-school";
import { AnnouncementDismissButton } from "@/components/announcement-dismiss-button";

export async function AnnouncementBanner({
  userId,
  active,
}: {
  userId: string;
  active: ActiveMembership;
}) {
  const announcements = await getVisibleAnnouncementsForUser(userId, active);
  if (announcements.length === 0) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-2 px-4 pt-4">
      {announcements.map((a) => {
        const daysRemaining = a.expiresAt
          ? Math.ceil((a.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          : null;
        return (
        <div
          key={a.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 dark:border-brand-800 dark:bg-brand-950/40"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-brand-800 dark:text-brand-300">{a.title}</p>
              {daysRemaining !== null && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {daysRemaining <= 0
                    ? "Expire aujourd'hui"
                    : `Expire dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}`}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-brand-700/90 dark:text-brand-400">{a.body}</p>
            {a.media.length > 0 && (
              <div className="mt-2.5 space-y-2.5">
                {a.media.map((m) => {
                  if (m.type === "IMAGE") {
                    // eslint-disable-next-line @next/next/no-img-element
                    return (
                      <img
                        key={m.id}
                        src={m.url}
                        alt=""
                        className="max-h-64 w-auto rounded-lg border border-brand-100"
                      />
                    );
                  }
                  if (m.type === "VIDEO") {
                    return (
                      <video
                        key={m.id}
                        src={m.url}
                        controls
                        className="max-h-64 w-full rounded-lg border border-brand-100"
                      />
                    );
                  }
                  return <audio key={m.id} src={m.url} controls className="w-full" />;
                })}
              </div>
            )}
          </div>
          <AnnouncementDismissButton announcementId={a.id} />
        </div>
        );
      })}
    </div>
  );
}
