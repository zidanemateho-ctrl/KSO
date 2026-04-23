import { ResultStatus, RiskLevel, Stream } from "@prisma/client";

const scientificKeywords = ["math", "physique", "chimie", "informatique", "science"];
const literaryKeywords = ["francais", "philo", "philosophie", "histoire", "geographie", "anglais"];
const economicKeywords = ["economie", "compta", "gestion", "finance"];
const technicalKeywords = ["tech", "mecanique", "electrique", "dessin", "atelier", "genie"];

export function computeResultStatus(average: number): ResultStatus {
  if (average >= 14) {
    return ResultStatus.EXCELLENT;
  }

  if (average >= 10) {
    return ResultStatus.ADMIS;
  }

  return ResultStatus.EN_DIFFICULTE;
}

export function computeRiskScore(params: { average: number; trend: number; weakCoreCount: number }) {
  const base = Math.max(0, Math.min(100, 100 - params.average * 5));
  const trendPenalty = params.trend < 0 ? Math.abs(params.trend) * 8 : -params.trend * 4;
  const corePenalty = params.weakCoreCount * 6;

  return Math.max(0, Math.min(100, base + trendPenalty + corePenalty));
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score > 65) {
    return RiskLevel.ELEVE;
  }

  if (score > 35) {
    return RiskLevel.MOYEN;
  }

  return RiskLevel.FAIBLE;
}

interface SubjectAverageInput {
  subjectName: string;
  average: number;
}

function matchesKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function recommendOrientation(subjectAverages: SubjectAverageInput[]) {
  const buckets: Record<Stream, number> = {
    [Stream.SCIENTIFIQUE]: 0,
    [Stream.LITTERAIRE]: 0,
    [Stream.ECONOMIQUE]: 0,
    [Stream.TECHNIQUE]: 0,
    [Stream.AUTRE]: 0
  };

  for (const item of subjectAverages) {
    const label = item.subjectName.toLowerCase();

    if (matchesKeyword(label, scientificKeywords)) {
      buckets[Stream.SCIENTIFIQUE] += item.average;
      continue;
    }

    if (matchesKeyword(label, literaryKeywords)) {
      buckets[Stream.LITTERAIRE] += item.average;
      continue;
    }

    if (matchesKeyword(label, economicKeywords)) {
      buckets[Stream.ECONOMIQUE] += item.average;
      continue;
    }

    if (matchesKeyword(label, technicalKeywords)) {
      buckets[Stream.TECHNIQUE] += item.average;
      continue;
    }

    buckets[Stream.AUTRE] += item.average;
  }

  const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
  const topStream = (sorted[0]?.[0] as Stream) ?? Stream.AUTRE;

  const careersByStream: Record<Stream, string[]> = {
    [Stream.SCIENTIFIQUE]: ["Ingenierie", "Data", "Architecture logicielle", "Sante"],
    [Stream.LITTERAIRE]: ["Droit", "Communication", "Journalisme", "Enseignement"],
    [Stream.ECONOMIQUE]: ["Finance", "Comptabilite", "Management", "Banque"],
    [Stream.TECHNIQUE]: ["Genie civil", "Maintenance industrielle", "Electronique", "Reseaux"],
    [Stream.AUTRE]: ["Orientation generaliste", "Accompagnement pedagogique", "Exploration de filieres"]
  };

  return {
    stream: topStream,
    careers: careersByStream[topStream]
  };
}
