export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter: string | null = null,
  ) {
    super(`Azure DevOps request failed (${status})`);
  }
}
export const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
export function retryDelay(
  retryAfter: string | null,
  attempt: number,
  now = Date.now(),
): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const ms = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(retryAfter) - now;
    if (Number.isFinite(ms)) return Math.max(0, ms);
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}
export class ReadOnlyHttp {
  constructor(
    private base: string,
    private token: () => Promise<string>,
    private fetcher: typeof fetch = fetch,
    private sleep = delay,
  ) {}
  async request<T>(path: string, body?: unknown): Promise<T> {
    // POST is permitted only for read-only WIQL and batch retrieval.
    if (
      !path.startsWith("/") ||
      path.includes("://") ||
      path.includes("..") ||
      (body !== undefined &&
        !/\/_apis\/wit\/(wiql|workitemsbatch)(\?|$)/.test(path))
    )
      throw new Error("Unsupported read-only operation");
    for (let attempt = 0; ; attempt++) {
      const response = await this.fetcher(
        this.base.replace(/\/$/, "") +
          path +
          (path.includes("?") ? "&" : "?") +
          "api-version=7.1",
        {
          method: body === undefined ? "GET" : "POST",
          credentials: "omit",
          headers: {
            Authorization: `Bearer ${await this.token()}`,
            Accept: "application/json",
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      );
      if (response.ok) return (await response.json()) as T;
      const error = new ApiError(
        response.status,
        response.headers.get("Retry-After"),
      );
      if (attempt >= 3 || ![429, 502, 503, 504, 500].includes(error.status))
        throw error;
      const wait = retryDelay(error.retryAfter, attempt);
      // A very long server delay is shown to the user; never retry earlier than requested.
      if (wait > 60000) throw error;
      await this.sleep(wait);
    }
  }
}
