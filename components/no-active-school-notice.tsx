import Link from "next/link";

export function NoActiveSchoolNotice() {
  return (
    <div className="card space-y-3 p-6 text-sm text-stone-600 dark:text-stone-400">
      <p>Aucun rattachement actif à une école pour ce compte.</p>
      <Link href="/rejoindre-ecole" className="font-medium text-brand-700 hover:underline">
        Rejoindre une école avec un code de rattachement
      </Link>
    </div>
  );
}
