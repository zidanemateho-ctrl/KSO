function increment(bucket: Map<string, number>, key: string, value = 1) {
  bucket.set(key, (bucket.get(key) ?? 0) + value);
}

export class MetricsStore {
  private readonly startedAt = Date.now();
  private readonly httpRequests = new Map<string, number>();
  private readonly httpRateLimited = new Map<string, number>();
  private readonly httpErrors = new Map<string, number>();

  recordRequest(method: string, route: string, statusCode: number) {
    const key = `${method}|${route}|${statusCode}`;
    increment(this.httpRequests, key);
  }

  recordRateLimited(method: string, route: string) {
    const key = `${method}|${route}`;
    increment(this.httpRateLimited, key);
  }

  recordError(kind: string) {
    increment(this.httpErrors, kind);
  }

  toPrometheus() {
    const lines: string[] = [];
    lines.push("# HELP kso_uptime_seconds Uptime du service en secondes.");
    lines.push("# TYPE kso_uptime_seconds gauge");
    lines.push(`kso_uptime_seconds ${Math.floor((Date.now() - this.startedAt) / 1000)}`);

    lines.push("# HELP kso_http_requests_total Nombre total de requetes HTTP.");
    lines.push("# TYPE kso_http_requests_total counter");
    for (const [key, value] of this.httpRequests.entries()) {
      const [method, route, status] = key.split("|");
      lines.push(`kso_http_requests_total{method="${method}",route="${route}",status="${status}"} ${value}`);
    }

    lines.push("# HELP kso_http_rate_limited_total Requetes rejetees par rate limit.");
    lines.push("# TYPE kso_http_rate_limited_total counter");
    for (const [key, value] of this.httpRateLimited.entries()) {
      const [method, route] = key.split("|");
      lines.push(`kso_http_rate_limited_total{method="${method}",route="${route}"} ${value}`);
    }

    lines.push("# HELP kso_http_errors_total Erreurs applicatives par type.");
    lines.push("# TYPE kso_http_errors_total counter");
    for (const [key, value] of this.httpErrors.entries()) {
      lines.push(`kso_http_errors_total{kind="${key}"} ${value}`);
    }

    return `${lines.join("\n")}\n`;
  }
}

export const metrics = new MetricsStore();
