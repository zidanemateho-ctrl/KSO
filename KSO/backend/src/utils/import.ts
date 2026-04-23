import { Semester, Sequence } from "@prisma/client";
import { parse } from "csv-parse/sync";
import XLSX from "xlsx";

import { AppError } from "./app-error";

export interface ImportedGradeRow {
  registrationNumber: string;
  subjectName: string;
  score: number;
  semester: Semester;
  sequence: Sequence;
  className?: string;
  comment?: string;
}

const semesterMap: Record<string, Semester> = {
  "1": Semester.SEMESTER_1,
  "2": Semester.SEMESTER_2,
  S1: Semester.SEMESTER_1,
  S2: Semester.SEMESTER_2,
  SEMESTER_1: Semester.SEMESTER_1,
  SEMESTER_2: Semester.SEMESTER_2
};

const sequenceMap: Record<string, Sequence> = {
  "1": Sequence.SEQUENCE_1,
  "2": Sequence.SEQUENCE_2,
  "3": Sequence.SEQUENCE_3,
  SEQUENCE_1: Sequence.SEQUENCE_1,
  SEQUENCE_2: Sequence.SEQUENCE_2,
  SEQUENCE_3: Sequence.SEQUENCE_3,
  SEQ_1: Sequence.SEQUENCE_1,
  SEQ_2: Sequence.SEQUENCE_2,
  SEQ_3: Sequence.SEQUENCE_3
};

function parseSemester(raw: string) {
  const normalized = raw.trim().toUpperCase();
  const semester = semesterMap[normalized];

  if (!semester) {
    throw new AppError(400, `Semestre invalide: ${raw}`);
  }

  return semester;
}

function parseSequence(raw?: string) {
  if (!raw?.trim()) {
    return Sequence.SEQUENCE_1;
  }

  const normalized = raw.trim().toUpperCase();
  const sequence = sequenceMap[normalized];

  if (!sequence) {
    throw new AppError(400, `Sequence invalide: ${raw}`);
  }

  return sequence;
}

function parseRow(raw: Record<string, unknown>): ImportedGradeRow {
  const registrationNumber = String(raw.registrationNumber ?? raw.matricule ?? "").trim();
  const subjectName = String(raw.subjectName ?? raw.matiere ?? "").trim();
  const semesterRaw = String(raw.semester ?? raw.semestre ?? "").trim();
  const sequenceRaw = String(raw.sequence ?? raw.seq ?? "").trim();
  const className = String(raw.className ?? raw.classe ?? "").trim();
  const comment = String(raw.comment ?? raw.remarque ?? "").trim();
  const scoreValue = Number(raw.score ?? raw.note ?? Number.NaN);

  if (!registrationNumber || !subjectName || Number.isNaN(scoreValue) || !semesterRaw) {
    throw new AppError(400, "Colonnes requises: registrationNumber, subjectName, score, semester");
  }

  return {
    registrationNumber,
    subjectName,
    score: scoreValue,
    semester: parseSemester(semesterRaw),
    sequence: parseSequence(sequenceRaw),
    className: className || undefined,
    comment: comment || undefined
  };
}

export function parseImportFile(fileBuffer: Buffer, mimetype: string): ImportedGradeRow[] {
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

  throw new AppError(400, "Format de fichier non supporte. Utilisez CSV ou Excel.");
}
