import {
  en,
  ja,
  formatMessage,
  message,
  MessageKey,
  resolveLanguage,
  validPreference,
  uniqueMessages,
} from "./messages";

test("日本語と英語で全キーと埋め込みパラメーターが揃う", () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(ja).sort());
  const parameters = (value: string) =>
    [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(ja) as MessageKey[]) {
    expect(en[key].trim().length).toBeGreaterThan(0);
    expect(parameters(en[key])).toEqual(parameters(ja[key]));
  }
});

test.each([
  ["auto", "ja-JP", "ja"],
  ["auto", "JA_jp", "ja"],
  ["auto", "en-US", "en"],
  ["auto", "fr-FR", "en"],
  ["auto", undefined, "en"],
  ["ja", "en-US", "ja"],
  ["en", "ja-JP", "en"],
] as const)(
  "言語設定 %s / ホスト %s は %s",
  (preference, culture, expected) => {
    expect(resolveLanguage(preference, culture)).toBe(expected);
  },
);

test("不明な保存値は自動判定へ戻し、診断はデータを保って両言語へ変換する", () => {
  expect(validPreference("fr")).toBe("auto");
  expect(validPreference(null)).toBe("auto");
  const value = message("wiqlFailed", { sprint: "お客様のSprint <1>" });
  expect(formatMessage(value, "ja")).toContain("の検索失敗");
  expect(formatMessage(value, "en")).toContain("お客様のSprint <1>");
  expect(formatMessage(value, "en")).toContain("failed");
  expect(formatMessage("外部の診断文字列", "en")).toBe("外部の診断文字列");
  expect(uniqueMessages([value, message(value.key, value.params)])).toEqual([
    value,
  ]);
});
