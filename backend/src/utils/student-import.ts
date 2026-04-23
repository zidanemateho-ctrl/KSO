import { Stream, StudentLevel, StudentProfileType } from "@prisma/client";
import { parse } from "csv-parse/sync";
import XLSX from "xlsx";

import { AppError } from "./app-error";

export interface ImportedStudentRow {
  registrationNumber: string;
  fullName: string;
  className?: string;
  level?: StudentLevel;
  stream?: Stream;
  profileType?: StudentProfileType;
  dreamCareer?: string;
  targetProfession?: string;
  guardianPhone?: string;
  academicYear?: string;
}

const levelMap: Record<string, StudentLevel> = {
  SECONDE: StudentLevel.SECONDE,
  "2NDE": StudentLevel.SECONDE,
  "2ND": StudentLevel.SECONDE,
  PREMIERE: StudentLevel.PREMIERE,
  "1ERE": StudentLevel.PREMIERE,
  TERMINALE: StudentLevel.TERMINALE,
  TLE: StudentLevel.TERMINALE,
  LOWER_SIXTH: StudentLevel.LOWER_SIXTH,
  "LOWER SIXTH": StudentLevel.LOWER_SIXTH,
  L6: StudentLevel.LOWER_SIXTH,
  UPPER_SIXTH: StudentLevel.UPPER_SIXTH,
  "UPPER SIXTH": StudentLevel.UPPER_SIXTH,
  U6: StudentLevel.UPPER_SIXTH,
  LICENCE_1: StudentLevel.LICENCE_1,
  L1: StudentLevel.LICENCE_1,
  LICENCE_2: StudentLevel.LICENCE_2,
  L2: StudentLevel.LICENCE_2,
  LICENCE_3: StudentLevel.LICENCE_3,
  L3: StudentLevel.LICENCE_3,
  MASTER_1: StudentLevel.MASTER_1,
  M1: StudentLevel.MASTER_1,
  MASTER_2: StudentLevel.MASTER_2,
  M2: StudentLevel.MASTER_2,
  AUTRE: StudentLevel.AUTRE
};

const streamMap: Record<string, Stream> = {
  SCIENTIFIQUE: Stream.SCIENTIFIQUE,
  SCIENCE: Stream.SCIENTIFIQUE,
  LITTERAIRE: Stream.LITTERAIRE,
  LITTERATURE: Stream.LITTERAIRE,
  ECONOMIQUE: Stream.ECONOMIQUE,
  ECONOMIE: Stream.ECONOMIQUE,
  TECHNIQUE: Stream.TECHNIQUE,
  AUTRE: Stream.AUTRE
};

const profileMap: Record<string, StudentProfileType> = {
  ELEVE: StudentProfileType.ELEVE,
  ETUDIANT: StudentProfileType.ETUDIANT
};

function parseLevel(raw?: string) {
  if (!raw?.trim()) {
    return undefined;
  }

  const normalized = raw.trim().toUpperCase();
  const level = levelMap[normalized];

  if (!level) {
    throw new AppError(400, `Niveau invalide: ${raw}`);
  }

  return level;
}

function parseStream(raw?: string) {
  if (!raw?.trim()) {
    return undefined;
  }

  const normalized = raw.trim().toUpperCase();
  const stream = streamMap[normalized];

  if (!stream) {
    throw new AppError(400, `Serie invalide: ${raw}`);
  }

  return stream;
}

function parseProfileType(raw?: string) {
  if (!raw?.trim()) {
    return undefined;
  }

  const normalized = raw.trim().toUpperCase();
  const profileType = profileMap[normalized];

  if (!profileType) {
    throw new AppError(400, `Type de profil invalide: ${raw}`);
  }

  return profileType;
}

function parseRow(raw: Record<string, unknown>): ImportedStudentRow {
  const registrationNumber = String(raw.registrationNumber ?? raw.matricule ?? raw.matriculeUnique ?? "").trim();
  const fullName = String(raw.fullName ?? raw.nom ?? raw.name ?? "").trim();
  const className = String(raw.className ?? raw.classe ?? "").trim();
  const levelRaw = String(raw.level ?? raw.niveau ?? "").trim();
  const streamRaw = String(raw.stream ?? raw.serie ?? raw.filiere ?? "").trim();
  const profileRaw = String(raw.profileType ?? raw.profil ?? "").trim();
  const dreamCareer = String(raw.dreamCareer ?? raw.metierDeReve ?? "").trim();
  const targetProfession = String(raw.targetProfession ?? raw.metierCible ?? "").trim();
  const guardianPhone = String(raw.guardianPhone ?? raw.telephoneParent ?? "").trim();
  const academicYear = String(raw.academicYear ?? raw.anneeAcademique ?? "").trim();

  if (!registrationNumber || !fullName) {
    throw new AppError(400, "Colonnes requises: registrationNumber (ou matricule), fullName (ou nom)");
  }

  return {
    registrationNumber: registrationNumber.toUpperCase(),
    fullName,
    className: className || undefined,
    level: parseLevel(levelRaw),
    stream: parseStream(streamRaw),
    profileType: parseProfileType(profileRaw),
    dreamCareer: dreamCareer || undefined,
    targetProfession: targetProfession || undefined,
    guardianPhone: guardianPhone || undefined,
    academicYear: academicYear || undefined
  };
}

export function parseStudentImportFile(fileBuffer: Buffer, mimetype: string): ImportedStudentRow[] {
  if (mimetype.includes("csv") || mimetype.includes("text/plain")) {
    const records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true
    }) as Record<string, unknown>[];

    return records.map(parseRow);
  }

  if (
    mimetype.includes("spreadsheet") ||
    mimetype.includes("excel") ||
    mimetype.includes("officedocument")
  ) {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const firstSheet = workbook.SheetNames[0];

    if (!firstSheet) {
      throw new AppError(400, "Fichier Excel vide");
    }

    const sheet = workbook.Sheets[firstSheet];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    return records.map(parseRow);
  }

  throw new AppError(400, "Format non supporte. Utilisez CSV ou Excel.");
}
