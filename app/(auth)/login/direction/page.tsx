import Link from "next/link";
import { LoginEspaceCard } from "@/components/login-espace-card";

export default function LoginDirectionPage() {
  return (
    <LoginEspaceCard
      title="Espace Direction"
      subtitle="Super Admin, Admin — connectez-vous à votre espace."
      espace="direction"
      footer={
        <p className="mt-5 text-center text-sm text-stone-500">
          Votre école n&apos;est pas encore inscrite ?{" "}
          <Link href="/creer-ecole" className="font-medium text-brand-700 hover:underline">
            Créer son espace
          </Link>
        </p>
      }
    />
  );
}
