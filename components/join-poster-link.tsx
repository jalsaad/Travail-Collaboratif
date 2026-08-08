/// Lien vers l'affiche A4 à imprimer (cf. app/api/affiche/route.ts), proposé
/// à la direction pour son école et à l'administration plateforme pour
/// n'importe laquelle. Ouvert dans un onglet : le PDF est servi en `inline`,
/// l'aperçu du navigateur permet d'imprimer sans télécharger.
///
/// Masqué s'il n'existe aucun code actif — l'affiche n'aurait rien à montrer,
/// et la route refuserait de la produire.
export function JoinPosterLink({ schoolId }: { schoolId?: string }) {
  return (
    <a
      href={schoolId ? `/api/affiche?schoolId=${encodeURIComponent(schoolId)}` : "/api/affiche"}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-secondary mt-3.5 inline-flex items-center gap-1.5"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.72 13.829q-.577.123-1.147.265m1.147-.265L5.159 17.55a2.25 2.25 0 0 0 .1 1.999m1.46-5.72a24 24 0 0 1 10.582 0m-10.582 0V6.75a2.25 2.25 0 0 1 2.25-2.25h6.083a2.25 2.25 0 0 1 2.25 2.25v7.079m0 0q.578.123 1.147.265m-1.147-.265 1.561 3.721a2.25 2.25 0 0 1-.1 1.999"
        />
      </svg>
      Affiche à imprimer (QR code)
    </a>
  );
}
