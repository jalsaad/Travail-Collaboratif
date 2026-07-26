import type { Role } from "@prisma/client";

export const roleLabel: Record<Role, string> = {
  DIRECTION: "Super Admin",
  REFERENT_NUMERIQUE: "Admin",
  ENSEIGNANT: "Enseignant·e",
};
