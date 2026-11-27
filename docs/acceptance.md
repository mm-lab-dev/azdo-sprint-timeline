# 実装結果・受け入れ確認

検証日: 2026-11-27。実データ用コードを実装済み。実組織へのインストール、認証済み接続、公開は未実施です。

## 自動検証

| 条件                          | 結果                       | 根拠                                                               |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------ |
| A01 US=S1、Task=S1/S2         | 合格                       | 単体・E2EでUSの2列と各Taskの1列を確認                              |
| A02 S2のみ選択、親US=S1       | 合格                       | 祖先保持、S1 Task除外、左継続矢印を確認                            |
| A03 未計画Feature             | 合格                       | 子の集約期間を表示。Feature自身のIterationは無視                   |
| A04 未計画兄弟                | 合格                       | 未計画US/Taskと別チームの起点を除外                                |
| A05 子なしUS                  | 合格                       | 自身のSprintだけで期間算出                                         |
| A06 S1/S3のTask               | 合格                       | 包絡は3列、S2を斜線で表示                                          |
| A07 Task非表示・USのみ        | 合格                       | 表示切替後も集約バーの列数を維持                                   |
| A08 折りたたみ・フィルター    | 合格                       | 祖先保持・必要階層展開、集約値の不変性を確認                       |
| A09 チームArea                | 合格                       | 完全一致/配下/パス境界、WIQL条件と安全な文字列生成                 |
| A10 200件超・重複・循環・欠損 | 合格                       | 201件を200+1、共通祖先バッチ、循環停止、欠損警告                   |
| A11 Sprint日数差              | 合格                       | 異なる日数でも150px等幅、Sprint見出しのみ                          |
| A12 403/429/空/古い応答       | 合格（ローカル）           | 状態別E2E、HTTP再試行・Retry-After、選択競合を確認                 |
| A13 閲覧専用                  | 合格（コード・自動テスト） | GETと読み取りWIQL/batch POSTだけ。更新POSTを拒否                   |
| A14 実組織SDKスモーク         | **未確認**                 | モックでテーマ・フォーム操作を検証。実組織は利用者の手動確認が必要 |

US自身が未計画の場合も、子Taskだけから実行期間を算出する単体ケースを含めています。Taskを取得・集約するためにUS自身のIterationを起点条件に要求しません。

実行コマンド: `npm test -- --coverage`（28件）、`npm run test:e2e`（11件）、`npm run lint`、`npm run format:check`、`npm run package:vsix`。最終実行結果は全て成功。Angular strictTemplates/TypeScript strictでビルドしています。

REST取得は7.1の実JSON応答形（配列のcount/valueラップを含む）をHTTP層からrepositoryまで通すテストで検証しています。これは実組織への接続成功を示すものではありません。

## 性能・画面・パッケージ

- 10Sprint/1000行、集約＋可視行変換を20回実測: 平均約4ms。
- Chromiumの1000行全展開・検索: 各約0.3秒。DOMの仮想化は未導入。ハードウェア・ブラウザー・負荷により変動します。
- 正確な測定値は`artifacts/performance-domain.json`と`artifacts/performance-ui.json`。
- ライト/ダーク画面: `artifacts/mock-light.png`、`artifacts/mock-dark.png`。画像を目視確認。
- VSIX: `artifacts/mm-lab.azdo-sprint-timeline-0.1.0.vsix`。tfx-cliで生成。表示名はSprint Timeline、publisherは`mm-lab`、一般公開用`public:true`。配布先組織の指定なし。Marketplaceへのアップロード・公開は未実施。
- VSIXには配布用dist、掲載用README・画像・関連文書、MITライセンス・第三者表記、拡張manifestを含めます。node_modules・テストコード・トークンは含めません。

## 残る検証と制限

1. A14は[手動スモーク手順](manual-smoke.md)に従い、利用者のpublisher・権限のあるテスト組織で確認が必要です。ローカル成功を実組織成功として扱っていません。
2. 対象はAgile標準Feature/US/Task、単一プロジェクト・単一チーム。カスタムタイプは祖先として保持して警告しますが、起点にはしません。
3. 範囲外の子Taskは取得・集約しません。表示は選択範囲の実行計画です。
4. publisherはユーザー指定の`mm-lab`です。Azure DevOpsでのpublisher権限は未確認のため、アップロード・導入前に確認してください。
