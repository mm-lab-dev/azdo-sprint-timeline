# Sprint Timeline — Azure DevOps 拡張機能 開発企画書

## 1. Codexへの指示
本書を実装仕様の初版とする。既存リポジトリがあれば AGENTS.md、package.json、構成を先に確認し、既存規約を優先する。空のリポジトリなら下記構成で初期化する。実装前に公式SDKの型定義・必要スコープ・API上限を確認し、差異は docs/decisions.md に記録する。モックで動作する縦断的なMVPを先に完成させ、次に実API接続、テスト、VSIX化を行う。実装・テスト・ビルド結果と未検証事項を報告する。公開・組織へのインストール・有料サービスの契約は勝手に実行しない。

## 2. 背景と目的
Azure Boards の Delivery Plans は User Story 自身の Iteration Path または明示的日付を基準とし、子Taskが別スプリントに所属する状況を自動で実行期間へ反映できない。OGIT Ganttは日付ベースであり、スプリントそのものを横軸の単位にできない。本拡張は既存のWork ItemとIterationの情報だけで、スクラムチームの複数スプリントにわたる実行計画を可視化する。日付の二重入力をなくす。

## 3. 製品概要・MVP範囲
- 仮称: Sprint Timeline。拡張ID: azdo-sprint-timeline（publisherは未決定）。
- Azure DevOps Services の Boards 配下に専用Hubを追加する。単一プロジェクト・単一選択チームを対象とする。
- 横軸は Sprint のみ。各Sprintを等幅1列とし、日・週・月目盛りは設けない。日付は列見出しの補助情報としてのみ表示する。
- 縦軸は Feature > User Story > Task。展開・折りたたみ、Task非表示、USのみ表示を提供する。
- 選択スプリントに所属するUSまたはTaskと、その祖先のみ取得・表示する。未計画の兄弟項目は混入させない。
- 子TaskのIterationからUS、USからFeatureの表示期間を自動集約する。Start Date / Target Date の設定は不要。元データは変更しない。
- 無料・閲覧専用。外部サーバー、DB、PAT、外部有料API、商用ガントライブラリを必要としない。
- 対象はAgileプロセスの標準3階層。ScrumのPBI、Basic、カスタムタイプ、Epic、複数チーム統合、編集、依存関係、キャパシティは将来拡張。

## 4. UI仕様
```text
Boards > Sprint Timeline
[Team ▼] [開始 Sprint ▼] [終了 Sprint ▼] [更新]
[表示: Feature / US / Task ▼] [すべて展開] [すべて折りたたむ]
[検索: ID / タイトル] [状態 ▼] [担当者 ▼]
──────────────────────────────────────────────────────────────
Work Item                   Sprint 1   Sprint 2   Sprint 3
                            11/2–15    11/16–29   11/30–12/13
▼ Feature A                 ██████████████████████████████
  ▼ US 101                  ████████████████████
      Task 201              ██████████
      Task 202                         ██████████
  ▼ US 102                             ████████████████████
      Task 203                         ██████████
      Task 204                                    ██████████
──────────────────────────────────────────────────────────────
```
- 初期範囲は現在のSprintと後続3Sprint（存在するもののみ）。現在がない場合は直近の未来Sprint、なければ最後のSprintを選ぶ。チーム変更時は範囲を再初期化する。過去のSprintも手動選択可能。
- 開始・終了選択はチームの時系列順。逆転はエラー。重複日程のSprintも別列として扱う。同一開始日の並びは終了日、path、idで決定的にソートする。
- 左の固定列: 展開ボタン、タイプアイコン、ID、タイトル、状態（担当者は任意列）。右は横スクロールする共通グリッド。ヘッダーを縦スクロール時も固定。
- 色はFeature/US/Taskで区別し、状態や色の意味を凡例とテキストでも伝える。現在Sprintの列を強調する。バークリックまたはIDクリックでSDKのWork Itemフォームを開く。取得できる場合は実期間、所属Sprint、集約元をツールチップで表示する。
- 初期展開はFeatureまで（US表示、Task折りたたみ）。表示モード変更・検索・折りたたみは集約値を変更しない。検索や状態・担当者フィルターは一致項目とその祖先を保持し、隠れた子に由来する期間がある場合は説明する。
- 読み込み中、空結果、権限不足、部分取得、通信エラーを区別する。リトライ・更新可能。Azure DevOpsのライト/ダークテーマ、キーボード操作、フォーカス可視化に対応。

## 5. 抽出・集約ルール（最重要）
### 5.1 抽出対象
既定の上端はFeatureとし、Epic選択時はEpicを上端とする。選択に応じた上端で祖先の取得・探索を終了し、それより上の祖先は表示・警告しない。その他の欠損・想定外階層でも、取得できるUS/Taskは保持する。

選択したチームのArea Path設定（includeChildrenを考慮）と、選択Sprintの正確なIteration Pathに一致するUS/Taskを起点（seed）とする。プロジェクト直下のIteration、未設定、日付なしの未計画項目は起点にしない。Featureは所属Sprintに関係なく必要な祖先だけ追加する。状態がClosed/Doneでも既定では除外しない。祖先はArea Path・Iteration・状態が起点条件外でも表示に必要なら同一プロジェクト内で取得する。

例: US1がSprint1、Task AがSprint1、Task BがSprint2、Task Cが未計画の場合、Sprint1–2選択時はUS1、A、Bを表示しCを除外。Sprint2のみ選択でもUS1とBを表示する。親にアクセスできない場合、起点を落とさず「親未取得」グループへ置き警告する。異なるプロジェクトの親はMVPで辿らない。

### 5.2 期間計算とクリッピング
- Sprintを日付順に並べ、絶対インデックスを割り当てる。Taskの有効期間は自身の所属Sprintの1列。
- USの期間は、自身の有効な所属Sprintと取得対象の子TaskのSprintの和集合の最小〜最大インデックス。Featureは配下USの期間を再帰集約する（Feature自身の所属Sprintは使わない）。
- MVPは選択範囲の実行計画を算出する。範囲外の子Taskは取得・集約しない。US自身の所属Sprintがチームの有効Sprintで範囲外の場合はクリップ前の集約に含める。範囲外に実行Taskが存在するかはMVPでは保証しないため、全期間と称さない。
- 表示区間は選択範囲との共通部分。既知の範囲外への継続は端の矢印で示す。範囲外の子を未取得である旨をヘルプに明記する。
- Sprint1とSprint3だけで作業する場合、USバーは1〜3を連続表示し、Sprint2は作業のない区間として薄色/斜線にする。Task実在スプリントと期間の包絡を区別する。
- 未計画の祖先は子から集約。子のない計画済みUSは自身のSprintのみ。親子循環、欠損、重複を防御し、想定外の階層は警告して表示可能な項目を保持する。
- 将来拡張: 起点の祖先USの全Taskを追加取得して真の全実行期間を算出するモード（範囲外のTaskは画面非表示）。

### 5.3 疑似コード
```ts
const seeds = await repository.findPlannedItems(teamAreas, selectedSprintPaths);
const graph = await repository.fetchAncestors(seeds); // IDで重複排除
const tree = buildTree(graph, seeds); // seedと祖先のみ
for (const node of postOrder(tree)) {
  const own = node.type === 'Feature' ? [] : validSprintIndex(node.iterationPath);
  node.activeSprints = union(own, ...node.children.map(c => c.activeSprints));
  node.interval = bounds(node.activeSprints); // empty => null
  node.visibleInterval = intersect(node.interval, selectedRange);
}
// フィルターや展開状態はここから後の表示用処理で適用する
```

## 6. Azure DevOps連携設計
SDK init/ready後にプロジェクトコンテキストを取得し、チーム一覧・チーム設定・全Iterationを取得する。選択範囲を決めてからWIQLを実行する。クエリ保存は必須としない。

| 操作 | REST API候補（SDKクライアント優先） |
|---|---|
| チーム一覧 | GET /_apis/projects/{projectId}/teams |
| チームIteration | GET /{project}/{team}/_apis/work/teamsettings/iterations |
| チームArea設定 | GET /{project}/{team}/_apis/work/teamsettings/teamfieldvalues |
| 起点ID検索 | POST /{project}/_apis/wit/wiql |
| Work Item詳細とリンク | POST /{project}/_apis/wit/workitemsbatch または SDK getWorkItems（Relations展開） |

API versionはSDKと公式文書に従い固定する（REST直接利用時は対応する安定版を優先）。チーム一覧のページング、WIQLの上限、Work Item一括取得の最大200件を考慮する。WIQL上限に達する場合はSprint等で分割し、なお上限なら範囲縮小を案内する。失敗や上限到達を無視して完全結果と表示しない。

WIQLの概念例（パスは実データで置換、Area条件はチーム設定から生成）:
```sql
SELECT [System.Id]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.WorkItemType] IN ('User Story', 'Task')
  AND [System.IterationPath] IN ('Project\\Sprint 1', 'Project\\Sprint 2')
  AND ([System.AreaPath] = 'Project\\Team A'
       OR [System.AreaPath] UNDER 'Project\\Team A\\SubArea')
ORDER BY [System.Id]
```
パスは実際のWIQL文字列では単一のバックスラッシュを使用する。文字列リテラルを安全に生成し、任意入力を直接連結しない。チームAreaの完全一致/配下条件はincludeChildrenに従う。CurrentIterationマクロに依存せず、取得済みSprintの完全パスを使う。

取得フィールド: System.Id, System.Title, System.WorkItemType, System.State, System.AssignedTo, System.IterationPath, System.AreaPath, System.TeamProject, System.Parent（利用可能なら）、relations。親リンクは System.LinkTypes.Hierarchy-Reverse を使用する。URLからIDを安全に抽出し、取得済みIDを除いて親をバッチ取得する。最大探索深度を設定し循環を検出する。必要な親がない場合のみ次のバッチを発行し、N+1を避ける。

## 7. 技術構成
- Angular + TypeScript + PrimeNG（新規時はAngular/PrimeNGの互換メジャーを選び、lockfile固定）。既存のAngular 19構成があれば優先する。
- SDK: azure-devops-extension-sdk / azure-devops-extension-api。RESTクライアントをラップしてドメイン層から隔離する。
- UI: CSS Gridを使う単一の行グリッドを基本とする。PrimeNGは選択・検索等に利用。TreeTableは固定列、横軸動的列、スクロール同期が簡潔に成立する場合のみ採用する。ガントライブラリ不要。
- 状態: Angular Signals（必要に応じRxJS）。純粋関数で抽出・集約・可視行変換を実装する。
- Jest、Playwright、ESLint、Prettier。新規リポジトリではnpmを使用する。

```text
src/app/
  core/azure-devops/       # SDK bootstrap, REST adapter, error mapping
  domain/                  # model, graph, sprint ordering, aggregation
  data/                    # repository interface, real/mock implementations
  features/execution-plan/ # toolbar, timeline, work-item row, view state
  shared/                  # styles, theme, reusable controls
src/assets/
fixtures/                  # mock datasets
e2e/                      # Playwright
docs/decisions.md
vss-extension.json
```

モデル例:
```ts
interface Sprint { id: string; name: string; path: string; start: string; finish: string; }
interface Item { id: number; type: string; title: string; state: string; iterationPath: string; areaPath: string; parentId?: number; assignedTo?: string; }
interface PlanNode { item: Item; children: PlanNode[]; activeSprints: number[]; interval: [number, number] | null; visibleInterval: [number, number] | null; }
```
日付は日単位の比較に正規化し、UTC/ローカル変換による日付ずれを防ぐ。並行リクエストは制限し、429/一時的5xxには上限付きバックオフとRetry-After対応。チーム変更や更新で古い応答を破棄する。トークンやWork Item本文をログに残さない。

## 8. 拡張機能パッケージング
- contribution type: ms.vss-web.hub、target: ms.vss-work-web.work-hub-group、name: Sprint Timeline。
- manifest scopesは読み取り専用の vso.work を基本とし、チーム一覧に必要な追加スコープ（例: vso.project）は公式仕様で確認のうえ最小限追加する。
- SDK認証を使用しPATを保存しない。ユーザーの既存権限を迂回しない。外部送信・テレメトリなし。永続化は必要ならチーム/表示設定のみ、Work Itemやトークンは保存しない。
- Angularの相対assetパス（base href等）とiframe内動作を確認する。SDKのテーマ通知・ロード完了通知を実装する。
- manifestは開発中 public:false。publisherは設定可能なプレースホルダーにし、実際のpublisher登録は利用者に委ねる。
- tfx-cliでVSIXを生成し、dist/の必要ファイルのみ含める。READMEにローカルモック起動、ビルド、パッケージ、テスト組織への手動導入手順を記載する。

## 9. テストと受け入れ条件
| ID | ケース | 合格条件 |
|---|---|---|
| A01 | US=S1、Task=S1/S2 | USバーがS1〜S2、Taskは各1列 |
| A02 | S2のみ選択、親US=S1 | 親USとFeatureが表示され、S1のみのTaskは非表示 |
| A03 | Feature未計画、US/Task計画済み | Featureが表示され子期間を集約 |
| A04 | 未計画の兄弟US/Task | 表示しない |
| A05 | 計画済みUSにTaskなし | US自身のSprintに表示 |
| A06 | S1/S3にのみTaskあり | 包絡バーS1〜S3、S2を作業なしとして区別 |
| A07 | Task非表示、USのみモード | USの期間が変わらない |
| A08 | 折りたたみ、検索、担当者フィルター | 期間を再計算せず必要祖先を保持 |
| A09 | チームArea完全一致/配下 | 他チームの起点が混入しない |
| A10 | 200件超、親重複、循環、欠損 | バッチ取得、重複なし、無限ループなし、警告 |
| A11 | Sprintの日数が異なる | すべて等幅1列、日週月の目盛りなし |
| A12 | 403、429、空結果、古い応答 | 状態別表示、再試行、競合防止 |
| A13 | 読み取り専用 | Work Item更新APIを一切呼ばない |
| A14 | SDK内起動、テーマ、フォーム遷移 | 実組織で手動スモークテスト成功 |

モックは最低3Sprint、2Feature、複数US、未計画Task、範囲外親、欠損親を含む。単体テストは純粋関数に集中し、E2Eはモックで主要画面フローを確認する。実組織テストは権限のある利用者が行う。性能目標（暫定）: 10Sprint/1000行で操作可能、集約は概ねO(N+E)、必要に応じ可視行の仮想化。実測値を記録し、未測定なら明記する。

## 10. 実装順序・完了条件
1. リポジトリ確認、依存関係とSDK仕様確認、実装計画・決定記録。
2. ドメインモデル、モックデータ、期間集約と抽出ロジック、単体テスト。
3. Sprint固定軸の画面、チーム・範囲選択、3階層、表示モード、フィルター、エラーUI。モックE2E。
4. SDK/REST adapter、チーム/Iteration/Area取得、WIQL、親取得、実データ接続。
5. ビルド・lint・単体/E2E、README、VSIX生成、実組織検証手順。
6. 実組織検証の結果は利用者と共有し、未確認を合格扱いしない。

推奨npm scripts: start:mock, build, lint, test, test:e2e, package:vsix。成果物はソース、lockfile、テスト、README、manifest、VSIX、実装結果報告。公開はMVP完了の必須条件ではない。

## 11. 将来拡張
複数チーム・Epic/PBI対応、全子Task集約モード、スプリントごとの工数集計、キャパシティ超過、依存関係、CSV/画像出力、設定共有。ドラッグ変更はIteration PathをどのWork Itemに書き戻すか別途合意してから実装する。

## 12. 参照資料と未確定事項
- Hub追加: https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-hub?view=azure-devops
- REST呼び出し: https://learn.microsoft.com/en-us/azure/devops/extend/develop/call-rest-api?view=azure-devops
- 認証: https://learn.microsoft.com/en-us/azure/devops/extend/develop/auth?view=azure-devops
- SDK: https://github.com/microsoft/azure-devops-extension-sdk
- APIクライアント: https://github.com/microsoft/azure-devops-extension-api
- REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/

仮称、初期4Sprint、閲覧専用、単一チーム、Agileプロセス、範囲内Task集約は本企画の暫定設計判断。実組織のカスタムWork Itemタイプ、Area構成、publisher、公開方針は未確認。SDK/RESTの実接続・VSIXのインストールは本書作成時点で未検証であり、Codex実装時に確認すること。
## 13. 表示・集約UIの追加仕様

- 表示種類をEpic / Feature / US / Taskのチェックボックスで複数選択する。既定はFeature / US / Task。Epic選択時だけEpicまで祖先を取得し、非選択の中間階層は飛ばして表示する。起点は従来どおり選択Sprint内のUS/Taskとし、元の期間集約は表示選択で変更しない。
- 同種・同じ実親・タイトル完全一致のWork Itemを表示上1行に統合する。親なし同士も対象。表示上の親が同じでも実親が異なれば統合しない。各項目のID・担当者・状態・Sprint・期間を保持し、セルが表す個別項目に遷移できるようにする。
- 状態と担当者もチェックボックス複数選択。項目間はOR、フィルター間はAND。全選択・全解除を用意し、全解除は一致なしとする。未割当担当者を選択可能にする。
- バーに担当者画像を表示し、画像が取れなければ頭文字を表示する。画像URLと担当者情報は実行中のみ保持する。
- 色はEpicがオレンジ、Featureが紫、USが水色、Taskがくすんだ黄色。Epicの文字アイコンはE。状態Activeは青、Close/Closedは緑。検索欄の背景・文字は他の入力欄と同じテーマに合わせる。
- バーの端に小さく完了率 `(Original Estimate − Remaining Work) / Original Estimate × 100` を表示する。親は取得したTaskの工数を加算し、統合行も元項目の集約値を加算する。負値・100%超を丸め込まない。見積が未設定または0なら割合を表示しない。不足項目を除いた参考値は*と説明で区別する。
- TaskのないUSも自身のSprintを斜線で表示する。Epic・Feature・US・統合行は取得した子孫Taskの所属Sprintで斜線を判定し、表示階層の省略やフィルターで変えない。
- 追加機能の検証後、0.2.0としてREADME・変更履歴・掲載画像を更新し、VSIXを生成する。

## 14. 表示調整の追加仕様

- Bugを表示種類と既定選択に追加する。USと同じ階層としてFeature → Bug → Taskを扱い、Bugも選択Sprint・チームAreaに一致する取得起点とする。未計画Bugは子Taskから祖先として取得し、取得対象の子Taskと自身の有効Sprintで期間を集約する。
- 未割当のバーには担当者アイコンを表示しない。未割当フィルターと担当者の説明は維持する。
- 進捗の表示はTaskのみとする。Epic・Feature・US・Bugには％・進捗の塗り・進捗ツールチップを表示しない。計算式・負値・100%超・見積未設定の扱いは維持する。
