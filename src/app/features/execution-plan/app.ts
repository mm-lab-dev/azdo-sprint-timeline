import {
  Component,
  ElementRef,
  InjectionToken,
  computed,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { InputTextModule } from "primeng/inputtext";
import { PlanRepository } from "../../data/repository";
import {
  Filters,
  Assignee,
  GraphResult,
  Interval,
  PlanNode,
  Row,
  Sprint,
  Team,
  WorkItemType,
  workItemTypes,
} from "../../domain/model";
import { assigneeOf } from "../../domain/assignee";
import { completionPercent, sumEffort } from "../../domain/effort";
import { AssigneeAvatar } from "../../shared/assignee-avatar";
import {
  buildPlan,
  day,
  initialRange,
  sortSprints,
  todayDay,
  visibleRows,
} from "../../domain/plan";
export const REPOSITORY = new InjectionToken<PlanRepository>("repository");
export const MOCK_MODE = new InjectionToken<boolean>("mock");
export function errorMessage(error: unknown): string {
  const e = error as { status?: number; statusCode?: number };
  const status = e?.status ?? e?.statusCode;
  const message =
    status === 403 || status === 401
      ? "権限不足: このチームまたはWork Itemを参照できません。"
      : status === 429
        ? "アクセス集中: 時間をおいて再試行してください。"
        : "通信エラー: 接続を確認して再試行してください。";
  return typeof status === "number" && status > 0
    ? `${message}（HTTP ${status}）`
    : message;
}
@Component({
  selector: "app-root",
  standalone: true,
  imports: [FormsModule, InputTextModule, AssigneeAvatar],
  templateUrl: "./app.html",
})
export class App {
  private readonly repository = inject(REPOSITORY);
  readonly mock = inject(MOCK_MODE);
  readonly teams = signal<Team[]>([]);
  readonly sprints = signal<Sprint[]>([]);
  readonly teamId = signal("");
  readonly range = signal<Interval>([0, 0]);
  readonly graph = signal<GraphResult>({
    items: [],
    seedIds: [],
    warnings: [],
  });
  readonly loading = signal(true);
  readonly error = signal("");
  readonly settingsWarnings = signal<string[]>([]);
  readonly notice = signal("");
  readonly filters = signal<Filters>({
    search: "",
    types: ["Feature", "User Story", "Task"],
    states: null,
    assignees: null,
  });
  readonly typeOptions = workItemTypes.map((type) => ({
    type,
    label: type === "User Story" ? "US" : type,
  }));
  readonly includeEpics = computed(() => this.filters().types.includes("Epic"));
  readonly itemChoices = signal<PlanNode[]>([]);
  readonly itemDialog = viewChild<ElementRef<HTMLDialogElement>>("itemDialog");
  readonly expanded = signal<Set<number>>(new Set());
  private generation = 0;
  readonly plan = computed(() =>
    buildPlan(this.graph(), this.sprints(), this.range(), {
      includeEpics: this.includeEpics(),
    }),
  );
  readonly rows = computed(() =>
    visibleRows(this.plan(), this.filters(), this.expanded()),
  );
  readonly hasPartialEffort = computed(() =>
    this.rows().some((row) => {
      const p = this.progress(row.members);
      return p.partial && p.percent !== null;
    }),
  );
  readonly selectedSprints = computed(() =>
    this.sprints().slice(this.range()[0], this.range()[1] + 1),
  );
  readonly grid = computed(
    () =>
      `minmax(330px, 420px) repeat(${this.selectedSprints().length}, 150px)`,
  );
  readonly plannedItems = computed(() => {
    const items = [];
    const pending = [...this.plan().roots];
    while (pending.length) {
      const node = pending.pop()!;
      items.push(node.item);
      pending.push(...node.children);
    }
    return items;
  });
  readonly states = computed(() =>
    [...new Set(this.plannedItems().map((i) => i.state))].sort(),
  );
  readonly assignees = computed(() =>
    [
      ...new Map(
        this.plannedItems().map((i) => {
          const person = assigneeOf(i);
          return [person.id, person] as const;
        }),
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name)),
  );
  readonly retrievalWarnings = computed(() => [
    ...new Set(this.graph().warnings),
  ]);
  readonly hierarchyWarnings = computed(() => this.plan().hierarchyWarnings);
  readonly hasFilters = computed(
    () =>
      !!(
        this.filters().search ||
        this.filters().states !== null ||
        this.filters().assignees !== null
      ),
  );
  constructor() {
    void this.initialize();
  }
  async initialize() {
    const version = ++this.generation;
    this.loading.set(true);
    this.error.set("");
    try {
      const teams = await this.repository.teams();
      if (version !== this.generation) return;
      this.teams.set(teams);
      if (teams.length) await this.changeTeam(this.teamId() || teams[0].id);
      else {
        this.teamId.set("");
        this.sprints.set([]);
        this.loading.set(false);
      }
    } catch (e) {
      if (version === this.generation) {
        this.error.set("チーム一覧: " + errorMessage(e));
        this.loading.set(false);
      }
    }
  }
  async changeTeam(id: string) {
    const version = ++this.generation;
    this.teamId.set(id);
    this.loading.set(true);
    this.error.set("");
    this.graph.set({ items: [], seedIds: [], warnings: [] });
    this.sprints.set([]);
    this.settingsWarnings.set([]);
    try {
      const settings = await this.repository.settings(id);
      if (version !== this.generation) return;
      const sorted = sortSprints(settings.sprints);
      this.sprints.set(sorted);
      this.settingsWarnings.set(settings.warnings);
      // Fixed fixture clock makes mock demonstrations reproducible.
      this.range.set(
        initialRange(sorted, this.mock ? "2026-11-16" : undefined),
      );
      await this.refresh();
    } catch (e) {
      if (version === this.generation) {
        this.error.set("Sprint・Area設定: " + errorMessage(e));
        this.loading.set(false);
      }
    }
  }
  async changeRange(edge: 0 | 1, value: string) {
    const range: Interval = [...this.range()];
    range[edge] = Number(value);
    this.range.set(range);
    await this.refresh();
  }
  async refresh() {
    if (!this.teams().length) {
      await this.initialize();
      return;
    }
    const version = ++this.generation;
    this.error.set("");
    this.notice.set("");
    this.graph.set({ items: [], seedIds: [], warnings: [] });
    if (this.range()[0] > this.range()[1]) {
      this.error.set(
        "範囲エラー: 開始Sprintは終了Sprint以前を選択してください。",
      );
      this.loading.set(false);
      return;
    }
    if (!this.sprints().length) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const result = await this.repository.load(
        this.teamId(),
        this.selectedSprints(),
        { includeEpics: this.includeEpics() },
      );
      if (version !== this.generation) return;
      this.graph.set(result);
      this.expanded.set(
        new Set(
          result.items
            .filter((i) => ["Epic", "Feature"].includes(i.type))
            .map((i) => i.id),
        ),
      );
    } catch (e) {
      if (version === this.generation) this.error.set(errorMessage(e));
    } finally {
      if (version === this.generation) this.loading.set(false);
    }
  }
  retry() {
    return this.teams().length
      ? this.changeTeam(this.teamId())
      : this.initialize();
  }
  updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    this.filters.update((f) => ({ ...f, [key]: value }));
  }
  toggleType(type: WorkItemType) {
    this.filters.update((f) => ({
      ...f,
      types: f.types.includes(type)
        ? f.types.filter((t) => t !== type)
        : [...f.types, type],
    }));
    if (type === "Epic" && this.includeEpics()) void this.refresh();
  }
  checked(key: "states" | "assignees", value: string) {
    return this.filters()[key] === null || this.filters()[key]!.includes(value);
  }
  toggleFilter(key: "states" | "assignees", value: string) {
    const available =
      key === "states" ? this.states() : this.assignees().map((a) => a.id);
    this.filters.update((f) => {
      const current = f[key] ?? available;
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...f, [key]: next.length === available.length ? null : next };
    });
  }
  filterCaption(key: "states" | "assignees") {
    const selected = this.filters()[key];
    return selected === null
      ? "すべて"
      : selected.length
        ? `${selected.length}件選択`
        : "選択なし";
  }
  isExpanded(row: Row) {
    return row.members.some((n) => this.expanded().has(n.item.id));
  }
  toggle(row: Row) {
    const collapse = this.isExpanded(row);
    this.expanded.update((old) => {
      const next = new Set(old);
      for (const member of row.members) {
        if (collapse) next.delete(member.item.id);
        else next.add(member.item.id);
      }
      return next;
    });
  }
  expandAll() {
    this.expanded.set(new Set(this.graph().items.map((i) => i.id)));
  }
  collapseAll() {
    this.expanded.set(new Set());
  }
  current(s: Sprint) {
    const today = this.mock ? "2026-11-16" : todayDay();
    return day(s.start) <= today && today <= day(s.finish);
  }
  date(s: string) {
    return day(s).replaceAll("-", "/").slice(5);
  }
  kind(n: PlanNode) {
    return n.item.type === "Epic"
      ? "epic"
      : n.item.type === "Feature"
        ? "feature"
        : n.item.type === "User Story"
          ? "story"
          : "task";
  }
  cellMembers(row: Row, absolute: number) {
    return row.members.filter(
      (n) =>
        !!n.visibleInterval &&
        absolute >= n.visibleInterval[0] &&
        absolute <= n.visibleInterval[1],
    );
  }
  occupied(row: Row, absolute: number) {
    return this.cellMembers(row, absolute).length > 0;
  }
  gap(row: Row, absolute: number) {
    return this.cellMembers(row, absolute).every(
      (n) => !n.taskSprints.includes(absolute),
    );
  }
  cellAssignees(members: PlanNode[]): Assignee[] {
    return [
      ...new Map(
        members.map((n) => {
          const p = assigneeOf(n.item);
          return [p.id, p] as const;
        }),
      ).values(),
    ];
  }
  personOf(node: PlanNode) {
    return assigneeOf(node.item);
  }
  memberIds(row: Row) {
    return row.members.map((n) => n.item.id).join(" ");
  }
  ids(members: PlanNode[]) {
    return members.map((n) => "#" + n.item.id).join(", ");
  }
  rowIds(row: Row) {
    return this.ids(row.members);
  }
  rowStates(row: Row) {
    return [...new Set(row.members.map((n) => n.item.state))];
  }
  activeState(state: string) {
    return state.toLowerCase() === "active";
  }
  closedState(state: string) {
    return ["close", "closed"].includes(state.toLowerCase());
  }
  progress(members: PlanNode[]) {
    const effort = sumEffort(members.map((n) => n.effort));
    const percent = completionPercent(effort);
    return {
      ...effort,
      percent,
      label: percent === null ? "" : `${Math.round(percent * 10) / 10}%`,
      fill: percent === null ? 0 : Math.max(0, Math.min(100, percent)),
      partial: effort.missingCount > 0,
      outside: percent !== null && (percent < 0 || percent > 100),
    };
  }
  progressTitle(members: PlanNode[]) {
    const p = this.progress(members);
    return p.percent === null
      ? "完了率: Original Estimateが未設定または0のため計算しません。"
      : `完了率 ${p.label}（当初見積 ${p.original}、残作業 ${p.remaining}）。${p.partial ? "見積・残作業が揃う項目だけで算出。未設定 " + p.missingCount + "件。" : ""}`;
  }
  rowTooltip(row: Row) {
    return row.members.map((n) => this.tooltip(n)).join("\n\n");
  }
  continuesBefore(members: PlanNode[]) {
    return members.some((n) => n.interval && n.interval[0] < this.range()[0]);
  }
  continuesAfter(members: PlanNode[]) {
    return members.some((n) => n.interval && n.interval[1] > this.range()[1]);
  }
  openMembers(members: PlanNode[]) {
    if (members.length === 1) {
      void this.open(members[0].item.id);
      return;
    }
    this.itemChoices.set(members);
    this.itemDialog()?.nativeElement.showModal();
  }
  chooseItem(id: number) {
    this.itemDialog()?.nativeElement.close();
    void this.open(id);
  }
  tooltip(n: PlanNode) {
    const names = n.activeSprints
      .map((i) => this.sprints()[i]?.name)
      .join(", ");
    return `${n.item.type} #${n.item.id}: ${n.item.title}\n状態: ${n.item.state} / 担当: ${n.item.assignedTo || "未割当"}\n自身のIteration: ${n.item.iterationPath}\n既知の期間: ${n.interval ? this.sprints()[n.interval[0]]?.start + " ～ " + this.sprints()[n.interval[1]]?.finish : "未計画"}\n集約元Sprint: ${names}\n${this.progressTitle([n])}\n取得した子TaskとUS自身の有効Sprintを集約。範囲外の子Taskは未取得。`;
  }
  async open(id: number) {
    try {
      await this.repository.openItem(id);
      if (this.mock) this.notice.set(`モック: Work Item #${id} を開きました。`);
    } catch {
      this.notice.set(
        "Work Itemフォームを開けませんでした。再試行してください。",
      );
    }
  }
}
