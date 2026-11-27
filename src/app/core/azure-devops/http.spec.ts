import { ApiError, ReadOnlyHttp, retryDelay } from "./http";
describe("read-only HTTP", () => {
  test("429 Retry-After秒数と503のバックオフ後に成功、認証トークン更新", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(
        new Response("", { status: 429, headers: { "Retry-After": "2" } }),
      )
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response('{"value":[]}'));
    const sleep = jest.fn().mockResolvedValue(undefined);
    const token = jest.fn().mockResolvedValue("secret");
    await expect(
      new ReadOnlyHttp(
        "https://dev.azure.com/org/",
        token,
        fetcher,
        sleep,
      ).request("/_apis/teams"),
    ).resolves.toEqual({ value: [] });
    expect(sleep.mock.calls).toEqual([[2000], [2000]]);
    expect(token).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://dev.azure.com/org/_apis/teams?api-version=7.1",
    );
  });
  test("Retry-After HTTP日付・長い待ち時間は再試行を早めない", async () => {
    expect(
      retryDelay(
        "Thu, 01 Jan 2026 00:00:05 GMT",
        0,
        Date.parse("2026-01-01T00:00:00Z"),
      ),
    ).toBe(5000);
    const sleep = jest.fn();
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        new Response("", { status: 429, headers: { "Retry-After": "120" } }),
      );
    await expect(
      new ReadOnlyHttp(
        "https://example.test",
        async () => "",
        fetcher,
        sleep,
      ).request("/_apis/test"),
    ).rejects.toBeInstanceOf(ApiError);
    expect(sleep).not.toHaveBeenCalled();
  });
  test("403を再試行しない、503は最大4回", async () => {
    for (const status of [403, 503]) {
      const fetcher = jest.fn().mockResolvedValue(new Response("", { status }));
      await expect(
        new ReadOnlyHttp(
          "https://example.test",
          async () => "",
          fetcher,
          async () => {},
        ).request("/_apis/test"),
      ).rejects.toMatchObject({ status });
      expect(fetcher).toHaveBeenCalledTimes(status === 403 ? 1 : 4);
    }
  });
  test("A13 更新系POSTを拒否しWIQLとbatchだけを許可", async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response("{}"));
    const http = new ReadOnlyHttp(
      "https://example.test",
      async () => "",
      fetcher,
    );
    await expect(http.request("/p/_apis/wit/workitems/1", {})).rejects.toThrow(
      "read-only",
    );
    await http.request("/p/_apis/wit/wiql", { query: "SELECT" });
    expect(fetcher.mock.calls[0][1].method).toBe("POST");
  });
});
