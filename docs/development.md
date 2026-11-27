# Development

Azure BoardsにSprint単位の閲覧専用タイムラインを追加するAzure DevOps Services拡張です。AgileのFeature → User Story → Taskに対応します。

USのIteration Pathだけに依存せず、取得対象の子Taskの所属Sprintを集約します。US自身の有効なSprintも和集合に含め、Feature自身のIterationは使いません。横軸は日・週・月ではなく、すべて等幅のSprint列です。

## ローカル開発

Node.js 22.12以降（検証: 22.23.4）、npm 10以降。

```powershell
npm ci
npm run start:mock
```

http://127.0.0.1:4200 を開きます。スタンドアロンではモック、Azure DevOps Hubのiframeでは実データモードです。モックの基準日は2026-11-16に固定し、実データはブラウザーの現在の暦日を使います。Sprint自体の日付はタイムゾーン変換しません。`?scenario=403`、`429`、`network`、`empty`、`partial`、`slow`、`large`で異常状態・性能用データを確認できます。

```powershell
npm test -- --coverage
npm run lint
npm run format:check
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $PWD '.cache/ms-playwright'
$env:TEMP = Join-Path $PWD '.cache/tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force $env:TEMP | Out-Null
npx playwright install chromium
npm run test:e2e
npm run package:vsix
```

依存・ブラウザー・ビルドのキャッシュとテスト出力はリポジトリ内です。`dist/`にビルド、`artifacts/`にVSIX・画面キャプチャ・性能測定、`playwright-report/`にE2Eレポートを生成します。

Angularはラッパースクリプトを通して起動し、一時出力先も`.cache/tmp`へ固定します。E2Eは開発サーバーとの競合を避けて4211番ポートを使います（`E2E_PORT`で変更可能）。

## 集約と表示

- 選択チームのArea（includeChildren対応）と選択Sprintの正確なパスに一致するUS/Taskを起点に、必要な同一プロジェクトの祖先だけ取得します。Closedを除外しません。
- 子Taskは自身のSprint 1列。USは自身の有効Sprintと取得した子Taskの和集合の最小〜最大。Featureは子から集約します。
- 範囲外の子Taskは取得しません。祖先US自身の既知の範囲外Sprintはクリップ前の期間に含め、矢印で示します。この表示は「全期間」ではありません。
- Taskのない中間Sprintは斜線。Taskがない計画済みUSは自身のSprintを表示します。
- 表示モード、検索、担当者・状態フィルター、折りたたみは集約期間を変更しません。フィルターは一致項目と祖先を残し、必要な階層を自動展開します。
- 取得漏れ、欠損親、別プロジェクトの親、循環、対象外階層、上限は警告します。空の成功結果として隠しません。

## API・セキュリティ

SDK 4.2で認証、プロジェクト/Location取得、テーマ同期、ロード完了通知、Work Itemフォーム遷移。読み取りRESTは7.1固定。Teamsページング、WIQLをSprintごとに分割、Work Itemを200件バッチ、祖先探索は最大64階層。429/500/502/503/504は最大3回再試行し、Retry-Afterの秒/HTTP日付を尊重します。60秒超なら待ち続けずエラー表示します。チーム・範囲変更で古い応答を破棄します。

スコープは`vso.work`と`vso.project`のみ。Work Itemの更新APIはありません。POSTは読み取り用WIQL/batchだけです。PAT、外部バックエンド、テレメトリ、データ永続化はありません。取得データ・トークンをログ出力しません。

生成SDKクライアントを使わない理由と公式資料は[決定記録](decisions.md)に記載しています。

## VSIXと一般公開の準備

表示名は`Sprint Timeline`、publisherは`mm-lab`、拡張IDは`azdo-sprint-timeline`です。配布方式は一般公開（`public:true`）で、配布先組織は指定しません。Marketplaceへのアップロード・公開は未実施です。別のpublisherを使う場合は指定して再生成してください。

```powershell
$env:AZDO_PUBLISHER = 'your-publisher-id'
npm run package:vsix
```

1. 利用者がMarketplaceのpublisher管理画面で公開権限を確認し、レビュー済みのVSIXをAzure DevOps拡張としてアップロードします。公開手順は[Publishing](../PUBLISHING.md)を参照してください。
2. 組織管理者が`vso.work` / `vso.project`の読み取り権限を確認してインストールします。
3. AgileプロジェクトのBoards → Sprint Timelineを開きます。
4. [手動スモーク手順](manual-smoke.md)でA14を確認します。

この作業では公開・アップロード・組織へのインストールを実行しません。実組織テストなしでA14を合格にしません。

## 構成と検証

`src/app/domain`は純粋な抽出・集約・表示関数、`data`はrepository、`core/azure-devops`はSDK/HTTP、`features/execution-plan`はSignalsベースのUIです。PrimeNGは検索入力とテーマに使用します。

[実装計画](implementation-plan.md) / [受け入れ結果](acceptance.md) / [決定記録](decisions.md)
