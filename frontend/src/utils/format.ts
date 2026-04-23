export function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function formatDecimal(value: number, digits = 2) {
  return value.toFixed(digits);
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatSemester(value: string) {
  return value === "SEMESTER_1" ? "Semestre 1" : "Semestre 2";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
