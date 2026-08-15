import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { assertCanManageSchool, ForbiddenError } from "@/lib/school-authorization";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { loadExportHeaderLogos } from "@/lib/export-logos";
import { getBaseUrl } from "@/lib/mailer";
import { buildJoinPosterPdf } from "@/lib/join-poster";

// Affiche à imprimer, servie aux deux espaces autorisés à la produire :
//  - sans paramètre, la direction ou le référent numérique de l'école active ;
//  - avec ?schoolId=, l'administration plateforme, pour n'importe quelle école.
//
// Une seule route plutôt que deux : le document est identique, seule la façon
// de désigner l'école et de vérifier le droit change.
export async function GET(request: Request) {
  const session = await auth();
  // On teste userId, pas seulement session : hors session, auth() renvoie un
  // objet dépourvu d'identifiant plutôt que null, et les requêtes Prisma
  // partiraient avec un userId indéfini.
  if (!session?.userId) return NextResponse.redirect(new URL("/login", request.url));

  const requestedSchoolId = new URL(request.url).searchParams.get("schoolId");

  let schoolId: string;
  try {
    if (requestedSchoolId) {
      await assertIsSuperAdmin(session.userId);
      schoolId = requestedSchoolId;
    } else {
      const active = await resolveActiveMembership(session.userId);
      if (!active) return NextResponse.redirect(new URL("/mes-periodes", request.url));
      // Re-vérification fraîche en base, jamais la seule école active du cookie.
      await assertCanManageSchool(session.userId, active.schoolId);
      schoolId = active.schoolId;
    }
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.redirect(new URL("/mes-periodes", request.url));
    }
    throw error;
  }

  const [school, joinCode] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId } }),
    prisma.joinCode.findFirst({ where: { schoolId, active: true } }),
  ]);
  if (!school) return NextResponse.json({ error: "École introuvable." }, { status: 404 });
  if (!joinCode) {
    return NextResponse.json(
      { error: "Aucun code de rattachement actif : générez-en un avant d'imprimer l'affiche." },
      { status: 400 }
    );
  }

  const baseUrl = await getBaseUrl();
  const logos = await loadExportHeaderLogos(school.logoUrl);

  const buffer = await buildJoinPosterPdf({
    schoolName: school.name,
    joinCode: joinCode.code,
    joinUrl: `${baseUrl}/rejoindre?code=${encodeURIComponent(joinCode.code)}`,
    schoolLogo: logos.school,
    platformLogo: logos.platform,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // inline : l'aperçu du navigateur permet d'imprimer directement.
      "Content-Disposition": `inline; filename="affiche-rattachement.pdf"`,
    },
  });
}
