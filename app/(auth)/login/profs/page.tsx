import Link from "next/link";
import { LoginEspaceCard } from "@/components/login-espace-card";

export default function LoginProfsPage() {
  return (
    <LoginEspaceCard
      title="Espace Profs"
      subtitle="Enseignant·es — connectez-vous à votre espace."
      espace="profs"
      footer={
        <p className="mt-5 text-center text-sm text-stone-500">
          Pas encore de compte ?{" "}
          <Link href="/rejoindre" className="font-medium text-brand-700 hover:underline">
            Rejoindre votre école avec un code
          </Link>
        </p>
      }
    />
  );
}
