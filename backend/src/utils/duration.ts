export function parseDurationToMs(value: string, fallbackMs: number) {
  const normalized = value.trim().toLowerCase();
  const matched = normalized.match(/^(\d+)(ms|s|m|h|d)?$/);

  if (!matched) {
    return fallbackMs;
  }

  const amount = Number(matched[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return fallbackMs;
  }

  const unit = matched[2] || "ms";
  if (unit === "ms") {
    return amount;
  }
  if (unit === "s") {
    return amount * 1000;
  }
  if (unit === "m") {
    return amount * 60 * 1000;
  }
  if (unit === "h") {
    return amount * 60 * 60 * 1000;
  }

  return amount * 24 * 60 * 60 * 1000;
}
