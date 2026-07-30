import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SupportTicketForm } from "@/components/support-ticket-form";
import { Reveal } from "@/components/reveal";

export default async function AssistancePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Assistance</h1>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Une question, un blocage, un bug à signaler ? Décrivez votre demande, nous vous répondons par email.
      </p>
      <Reveal>
        <SupportTicketForm />
      </Reveal>
    </div>
  );
}
