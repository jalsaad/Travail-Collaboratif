// Gabarit HTML commun à tous les emails de la plateforme. Isolé de
// lib/mailer.ts, qui importe next/headers et n'est donc utilisable que dans
// une requête : les envois hors requête (scripts de campagne) ont besoin du
// gabarit sans le transport.

// Gabarit HTML en tableaux et styles en ligne : Outlook ignore les feuilles de
// style externes et gère mal flexbox/grid. Les couleurs reprennent celles de
// la plateforme (--color-brand-600 et --color-brand-teal de app/globals.css).
export const BRAND_600 = "#1f6fc4";
export const BRAND_TEAL = "#14b8a6";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/// Une ligne « libellé / valeur » de l'encadré récapitulatif.
export type EmailRow = { label: string; value: string };

/// Gabarit commun à tous les emails de la plateforme : bandeau dégradé,
/// titre, encadré récapitulatif, bouton d'action facultatif, pied de page.
/// Toujours en clair : les clients de messagerie gèrent mal les thèmes
/// sombres, un fond adaptatif y donnerait des rendus illisibles.
export function renderBrandedEmail(params: {
  eyebrow: string;
  title: string;
  /// Paragraphes libres entre le titre et l'encadré, en HTML déjà échappé.
  /// Les emails transactionnels s'en passent ; une invitation a besoin d'un
  /// corps de texte.
  bodyHtml?: string;
  rows: EmailRow[];
  cta?: { label: string; url: string; note?: string };
  footerHtml: string;
}): string {
  const { eyebrow, title, bodyHtml, rows, cta, footerHtml } = params;

  const rowsHtml = rows
    .map(
      ({ label, value }) => `
    <tr>
      <td style="padding:4px 12px 4px 0;color:#78716c;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td>
      <td style="padding:4px 0;color:#1c1917;font-size:13px;">${escapeHtml(value)}</td>
    </tr>`
    )
    .join("");

  const ctaHtml = cta
    ? `
    <tr>
      <td style="padding:22px 28px 6px 28px;" align="center">
        <a href="${cta.url}" style="display:inline-block;padding:13px 26px;background:${BRAND_600};background-image:linear-gradient(90deg,${BRAND_600},${BRAND_TEAL});color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
          ${escapeHtml(cta.label)}
        </a>${
          cta.note
            ? `
        <p style="margin:12px 0 0;font-size:12px;color:#78716c;">
          ${escapeHtml(cta.note)}
        </p>`
            : ""
        }
      </td>
    </tr>`
    : "";

  const bodyBlockHtml = bodyHtml
    ? `
    <tr>
      <td style="padding:14px 28px 0 28px;color:#44403c;font-size:14px;line-height:1.65;">
        ${bodyHtml}
      </td>
    </tr>`
    : "";

  const rowsBlockHtml =
    rows.length > 0
      ? `
    <tr>
      <td style="padding:16px 28px 4px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:14px 16px;">
          ${rowsHtml}
        </table>
      </td>
    </tr>`
      : "";

  return `
<div style="margin:0;padding:24px 12px;background:#fafaf9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="height:6px;background:${BRAND_600};background-image:linear-gradient(90deg,${BRAND_600},${BRAND_TEAL});font-size:0;line-height:6px;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding:28px 28px 8px 28px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${BRAND_600};">${escapeHtml(eyebrow)}</p>
        <h1 style="margin:0;font-size:19px;line-height:1.35;color:#1c1917;font-weight:600;">
          ${title}
        </h1>
      </td>
    </tr>
    ${bodyBlockHtml}${rowsBlockHtml}${ctaHtml}
    <tr>
      <td style="padding:18px 28px 28px 28px;border-top:1px solid #f5f5f4;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#78716c;">
          ${footerHtml}
        </p>
      </td>
    </tr>
  </table>
</div>`;
}
