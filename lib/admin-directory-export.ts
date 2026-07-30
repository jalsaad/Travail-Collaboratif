import ExcelJS from "exceljs";

// Une ligne = une Membership (pas un User) : un enseignant partagé entre
// écoles apparaît une fois par école, avec le rôle/les disciplines propres à
// cette école — cf. MembershipDiscipline, déjà scopé par membership.
export const ADMIN_DIRECTORY_COLUMNS = [
  { key: "firstName", label: "Prénom" },
  { key: "lastName", label: "Nom" },
  { key: "email", label: "Email" },
  { key: "matricule", label: "Matricule" },
  { key: "sex", label: "Sexe" },
  { key: "dateOfBirth", label: "Date de naissance" },
  { key: "schoolName", label: "École" },
  { key: "joinCode", label: "Code de rattachement" },
  { key: "reseau", label: "Réseau" },
  { key: "region", label: "Région" },
  { key: "niveaux", label: "Niveaux" },
  { key: "typesEnseignement", label: "Type d'enseignement" },
  { key: "role", label: "Rôle" },
  { key: "disciplines", label: "Disciplines" },
  { key: "status", label: "Statut" },
] as const;

export type DirectoryColumnKey = (typeof ADMIN_DIRECTORY_COLUMNS)[number]["key"];
export type DirectoryRow = Record<DirectoryColumnKey, string>;

const COLUMN_LABEL: Record<DirectoryColumnKey, string> = Object.fromEntries(
  ADMIN_DIRECTORY_COLUMNS.map((c) => [c.key, c.label])
) as Record<DirectoryColumnKey, string>;

function escapeCsvField(value: string): string {
  if (/[",\r\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildDirectoryCsv(rows: DirectoryRow[], columns: DirectoryColumnKey[]): string {
  const header = columns.map((key) => escapeCsvField(COLUMN_LABEL[key])).join(";");
  const lines = rows.map((row) => columns.map((key) => escapeCsvField(row[key] ?? "")).join(";"));
  // BOM UTF-8 : Excel ouvre correctement les accents sans ça sur Windows.
  return "﻿" + [header, ...lines].join("\r\n");
}

export async function buildDirectoryXlsx(
  rows: DirectoryRow[],
  columns: DirectoryColumnKey[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Utilisateurs");

  sheet.columns = columns.map((key) => ({ header: COLUMN_LABEL[key], key, width: 22 }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(columns.map((key) => row[key] ?? ""));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
