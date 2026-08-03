import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { toPickerDefaultValue } from "@/lib/discipline-form";
import { OwnProfileForm } from "@/components/own-profile-form";
import { TeachingInfoForm } from "@/components/teaching-info-form";
import { Reveal } from "@/components/reveal";

export default async function MonProfilPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const active = await resolveActiveMembership(session.userId);

  // Niveaux/heures/discipline sont scopés à la Membership (une école), pas au
  // User — chaque ligne niveau/heures porte sa propre discipline (cf.
  // commentaire du modèle MembershipLevelHours dans schema.prisma) — donc
  // affichés/modifiables pour l'école active, quel que soit le rôle : une
  // direction ou un référent numérique peut aussi donner cours (courant dans
  // les petites écoles), donc doit pouvoir déclarer/retrouver ses propres
  // heures — la section reste vide (facultative) si non applicable.
  let teachingInfo: {
    schoolName: string;
    levelHours: { level: string; hours: number; discipline: string; precision: string }[];
  } | null = null;

  if (active) {
    const membership = await prisma.membership.findUnique({
      where: { id: active.membershipId },
      include: { levelHours: { include: { discipline: true } } },
    });
    teachingInfo = {
      schoolName: active.schoolName,
      // discipline = code du référentiel (peut être vide pour une donnée
      // créée avant l'introduction du référentiel — le sélecteur affichera
      // alors simplement le placeholder, cf. components/level-hours-picker.tsx) ;
      // precision = texte libre préchargé quand c'était un "Autre (à préciser)".
      levelHours:
        membership?.levelHours.map((lh) => ({
          level: lh.level,
          hours: Number(lh.hours),
          ...toPickerDefaultValue(lh.discipline.code, lh.discipline.name),
        })) ?? [],
    };
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Mes données personnelles</h1>
      <Reveal>
        <OwnProfileForm
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
          dateOfBirth={user.dateOfBirth}
          sex={user.sex}
          matricule={user.matricule}
        />
      </Reveal>

      {teachingInfo && (
        <div>
          <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">Mon enseignement</h2>
          <Reveal className="mt-3">
            <TeachingInfoForm schoolName={teachingInfo.schoolName} levelHours={teachingInfo.levelHours} />
          </Reveal>
        </div>
      )}
    </div>
  );
}
