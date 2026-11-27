export const ja = {
  subtitle: "Taskの所属Sprintから、実行計画をつなぐ。",
  planSettings: "計画設定",
  team: "Team",
  teamsMissing: "チーム未取得",
  startSprint: "開始 Sprint",
  endSprint: "終了 Sprint",
  refresh: "更新",
  displaySettings: "表示設定",
  displayTypes: "表示する種類",
  workItemTypes: "表示するWork Item",
  typeLabel: "種類 {type}",
  expandAll: "すべて展開",
  collapseAll: "すべて折りたたむ",
  search: "検索",
  searchPlaceholder: "ID / タイトルを検索",
  state: "状態",
  assignee: "担当者",
  stateFilter: "状態フィルター",
  assigneeFilter: "担当者フィルター",
  stateLabel: "状態 {state}",
  assigneeLabel: "担当者 {name}",
  all: "すべて",
  selectAll: "全選択",
  clearAll: "全解除",
  selected: "{count}件選択",
  noneSelected: "選択なし",
  unassigned: "未割当",
  timelineStatus: "タイムラインと表示状況",
  executionPlan: "実行計画",
  displayRows: "{count} 表示行",
  taskGap: "Taskのない区間",
  scopeNote:
    "選択範囲の実行計画です。範囲外の子Taskは取得・集約しません。← → は既知の範囲外への継続を示します。",
  partialEffortNote: "完了率の * は、工数が未設定の項目を除いた参考値です。",
  filterNote:
    "一致項目と祖先を表示中。非表示の子に由来する集約期間も維持しています。",
  loading: "実行計画を読み込み中…",
  retry: "再試行",
  emptyTeams:
    "チーム一覧が0件でした。プロジェクトとチームの参照権限を確認し、再取得してください。",
  reloadTeams: "チーム一覧を再取得",
  sprintInformation: "表示するSprintについて",
  retrievalWarning: "一部の項目を取得できませんでした（{count}件）",
  hierarchyWarning: "階層を確認してください（{count}件）",
  showDetails: "詳細を表示",
  emptyPlan:
    "表示対象がありません。チーム・Sprint範囲・フィルターを確認してください。",
  timeline: "Sprintタイムライン",
  columns: "タイプ / ID / タイトル / 状態",
  current: "現在",
  orphanGroup: "親未取得グループ — 参照できる項目を保持しています",
  expandItem: "展開 #{id}",
  collapseItem: "折りたたむ #{id}",
  groupCount: "{count}件",
  parentMissing: "親未取得",
  noTask: "Taskなし",
  hasPlan: "計画あり",
  completionLabel: "完了率 {value}",
  assigneeCount: "{count}人の担当者",
  chooseItem: "Work Itemを選択",
  close: "閉じる",
  groupedItems: "この行にまとめた項目",
  readOnly: "閲覧専用",
  hierarchyFooter: "選択した種類で階層表示",
  openFooter: "バーまたはIDを選択してWork Itemを開く",
  autoLanguage: "自動",
  language: "言語",
  permissionError: "権限不足: このチームまたはWork Itemを参照できません。",
  rateLimitError: "アクセス集中: 時間をおいて再試行してください。",
  networkError: "通信エラー: 接続を確認して再試行してください。",
  httpStatus: "（HTTP {status}）",
  teamsStage: "チーム一覧",
  settingsStage: "Sprint・Area設定",
  rangeError: "範囲エラー: 開始Sprintは終了Sprint以前を選択してください。",
  initializationError:
    "初期化に失敗しました。Azure DevOpsの拡張Hubから再読み込みしてください。",
  progressUnavailable:
    "完了率: Original Estimateが未設定または0のため計算しません。",
  progressDetails:
    "完了率 {value}（当初見積 {original}、残作業 {remaining}）。",
  partialProgress: "見積・残作業が揃う項目だけで算出。未設定 {count}件。",
  tooltipState: "状態: {state} / 担当: {name}",
  tooltipIteration: "自身のIteration: {path}",
  tooltipPeriod: "既知の期間: {period}",
  unplanned: "未計画",
  tooltipSprints: "集約元Sprint: {names}",
  tooltipScope:
    "取得した子TaskとUS・Bug自身の有効Sprintを集約。範囲外の子Taskは未取得。",
  mockOpened: "モック: Work Item #{id} を開きました。",
  openFailed: "Work Itemフォームを開けませんでした。再試行してください。",
  hierarchyCycle: "親子循環: #{id} の親リンクを切断しました。",
  unexpectedHierarchy: "想定外の階層: #{parent} → #{child}",
  missingParent: "親未取得: #{id}（欠損・権限・別プロジェクト・循環）",
  unsupportedAncestor: "対象外タイプを祖先として保持: #{id} {type}",
  invalidIterations:
    "日付なし・無効日付・プロジェクト直下のIterationを除外しました。",
  missingSettings: "チームAreaまたはSprintが設定されていません。",
  wiqlLimit:
    "部分取得: {sprint} がWIQL上限に達しました。Sprint範囲またはチームAreaを縮小してください。",
  wiqlFailed:
    "部分取得: {sprint} の検索失敗（WIQL長/件数上限または設定）。範囲・Area設定を縮小してください。",
  crossProject: "別プロジェクトの親 #{id} は辿りません。",
  missingItems:
    "部分取得: {count}件を取得できませんでした（権限不足・削除等）。",
  depthLimit: "祖先探索の深さ上限64に到達しました。未取得の親があります。",
  mockPartial: "部分取得: 一部の項目を取得できませんでした。",
} as const;

export type MessageKey = keyof typeof ja;
export type Language = "ja" | "en";
export type LanguagePreference = "auto" | Language;
export type Parameters = Record<string, string | number>;
export interface Message {
  key: MessageKey;
  params?: Parameters;
}
export type Diagnostic = Message | string;

export const en: Record<MessageKey, string> = {
  subtitle: "Connect your execution plan through Task Sprints.",
  planSettings: "Plan settings",
  team: "Team",
  teamsMissing: "Teams not loaded",
  startSprint: "Start Sprint",
  endSprint: "End Sprint",
  refresh: "Refresh",
  displaySettings: "Display settings",
  displayTypes: "Visible types",
  workItemTypes: "Work item types",
  typeLabel: "Type {type}",
  expandAll: "Expand all",
  collapseAll: "Collapse all",
  search: "Search",
  searchPlaceholder: "Search ID or title",
  state: "State",
  assignee: "Assignee",
  stateFilter: "State filter",
  assigneeFilter: "Assignee filter",
  stateLabel: "State {state}",
  assigneeLabel: "Assignee {name}",
  all: "All",
  selectAll: "Select all",
  clearAll: "Clear all",
  selected: "{count} selected",
  noneSelected: "None selected",
  unassigned: "Unassigned",
  timelineStatus: "Timeline and display status",
  executionPlan: "Execution plan",
  displayRows: "{count} rows",
  taskGap: "No Tasks",
  scopeNote:
    "This plan covers the selected range. Child Tasks outside it are not fetched or aggregated. ← → indicate known continuation beyond the range.",
  partialEffortNote:
    "An asterisk (*) marks a reference completion value that excludes items missing effort fields.",
  filterNote:
    "Showing matches and their ancestors. Periods contributed by hidden children are preserved.",
  loading: "Loading execution plan…",
  retry: "Retry",
  emptyTeams:
    "No teams were returned. Check your project and team permissions, then try again.",
  reloadTeams: "Reload teams",
  sprintInformation: "About the available Sprints",
  retrievalWarning: "Some items could not be retrieved ({count})",
  hierarchyWarning: "Review the hierarchy ({count})",
  showDetails: "Show details",
  emptyPlan: "No items to display. Check your team, Sprint range, and filters.",
  timeline: "Sprint timeline",
  columns: "Type / ID / Title / State",
  current: "Current",
  orphanGroup: "Unavailable parents — accessible items are retained",
  expandItem: "Expand #{id}",
  collapseItem: "Collapse #{id}",
  groupCount: "{count} items",
  parentMissing: "Parent unavailable",
  noTask: "No Tasks",
  hasPlan: "Planned",
  completionLabel: "Completion {value}",
  assigneeCount: "{count} assignees",
  chooseItem: "Choose a Work Item",
  close: "Close",
  groupedItems: "Items grouped in this row",
  readOnly: "Read only",
  hierarchyFooter: "Hierarchy follows the selected types",
  openFooter: "Select a bar or ID to open a Work Item",
  autoLanguage: "Automatic",
  language: "Language",
  permissionError: "Access denied: you cannot view this team or Work Item.",
  rateLimitError: "Too many requests. Wait a moment and try again.",
  networkError: "Connection error. Check your connection and try again.",
  httpStatus: " (HTTP {status})",
  teamsStage: "Team list",
  settingsStage: "Sprint and Area settings",
  rangeError:
    "Invalid range: the start Sprint must be before or equal to the end Sprint.",
  initializationError:
    "Initialization failed. Reload this extension from its Azure DevOps hub.",
  progressUnavailable:
    "Completion is unavailable because Original Estimate is missing or zero.",
  progressDetails:
    "Completion {value} (Original Estimate {original}, Remaining Work {remaining}).",
  partialProgress:
    "Calculated only from items with both estimates and remaining work. Missing fields: {count}.",
  tooltipState: "State: {state} / Assignee: {name}",
  tooltipIteration: "Own Iteration: {path}",
  tooltipPeriod: "Known period: {period}",
  unplanned: "Unplanned",
  tooltipSprints: "Source Sprints: {names}",
  tooltipScope:
    "Aggregates fetched child Tasks and valid Story/Bug Sprint assignments. Child Tasks outside the range are not fetched.",
  mockOpened: "Mock: opened Work Item #{id}.",
  openFailed: "Could not open the Work Item form. Try again.",
  hierarchyCycle: "Hierarchy cycle: detached the parent link of #{id}.",
  unexpectedHierarchy: "Unexpected hierarchy: #{parent} → #{child}",
  missingParent:
    "Parent unavailable: #{id} (missing, permissions, another project, or a cycle)",
  unsupportedAncestor: "Retained unsupported ancestor type: #{id} {type}",
  invalidIterations:
    "Excluded Iterations with missing or invalid dates and project-root Iterations.",
  missingSettings: "No team Areas or Sprints are configured.",
  wiqlLimit:
    "Partial retrieval: {sprint} reached the WIQL limit. Reduce the Sprint range or team Areas.",
  wiqlFailed:
    "Partial retrieval: the query for {sprint} failed (WIQL length, result limit, or configuration). Reduce the range or Areas.",
  crossProject:
    "Parent #{id} belongs to another project and will not be traversed.",
  missingItems:
    "Partial retrieval: {count} items could not be retrieved (permissions, deletion, etc.).",
  depthLimit:
    "Reached the 64-level ancestor traversal limit. Some parents were not retrieved.",
  mockPartial: "Partial retrieval: some items could not be retrieved.",
};

export const message = (key: MessageKey, params?: Parameters): Message => ({
  key,
  params,
});
export function translate(
  key: MessageKey,
  language: Language,
  params: Parameters = {},
): string {
  return (language === "ja" ? ja[key] : en[key]).replace(
    /\{(\w+)\}/g,
    (placeholder, name: string) =>
      params[name] === undefined ? placeholder : String(params[name]),
  );
}
export function formatMessage(
  value: Diagnostic,
  language: Language = "ja",
): string {
  return typeof value === "string"
    ? value
    : translate(value.key, language, value.params);
}
export function resolveLanguage(
  preference: LanguagePreference,
  culture?: string,
): Language {
  return preference !== "auto"
    ? preference
    : /^ja(?:[-_]|$)/i.test(culture || "")
      ? "ja"
      : "en";
}
export function validPreference(value: unknown): LanguagePreference {
  return value === "ja" || value === "en" ? value : "auto";
}

export function uniqueMessages(values: Diagnostic[]): Diagnostic[] {
  return [
    ...new Map(values.map((value) => [JSON.stringify(value), value])).values(),
  ];
}
