import {
  Component,
  InjectionToken,
  computed,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { InputTextModule } from "primeng/inputtext";
import { PlanRepository } from "../../data/repository";
import {
  Filters,
  GraphResult,
  Interval,
  PlanNode,
  Sprint,
  Team,
} from "../../domain/model";
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
  return status === 403 || status === 401
    ? "権限不足: このチームまたはWork Itemを参照できません。"
    : status === 429
      ? "アクセス集中: 時間をおいて再試行してください。"
      : "通信エラー: 接続を確認して再試行してください。";
}
@Component({
  selector: "app-root",
  standalone: true,
  imports: [FormsModule, InputTextModule],
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
    state: "",
    assignee: "",
    mode: "all",
  });
  readonly expanded = signal<Set<number>>(new Set());
  private generation = 0;
  readonly plan = computed(() =>
    buildPlan(this.graph(), this.sprints(), this.range()),
  );
  readonly rows = computed(() =>
    visibleRows(this.plan(), this.filters(), this.expanded()),
  );
  readonly selectedSprints = computed(() =>
    this.sprints().slice(this.range()[0], this.range()[1] + 1),
  );
  readonly grid = computed(
    () =>
      `minmax(330px, 420px) repeat(${this.selectedSprints().length}, 150px)`,
  );
  readonly states = computed(() =>
    [...new Set(this.graph().items.map((i) => i.state))].sort(),
  );
  readonly assignees = computed(() =>
    [
      ...new Set(
        this.graph().items.flatMap((i) => (i.assignedTo ? [i.assignedTo] : [])),
      ),
    ].sort(),
  );
  readonly warnings = computed(() => [
    ...this.settingsWarnings(),
    ...this.plan().warnings,
  ]);
  readonly hasFilters = computed(
    () =>
      !!(
        this.filters().search ||
        this.filters().state ||
        this.filters().assignee
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
        this.sprints.set([]);
        this.loading.set(false);
      }
    } catch (e) {
      if (version === this.generation) {
        this.error.set(errorMessage(e));
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
        this.error.set(errorMessage(e));
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
      );
      if (version !== this.generation) return;
      this.graph.set(result);
      this.expanded.set(
        new Set(
          result.items.filter((i) => i.type === "Feature").map((i) => i.id),
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
  toggle(id: number) {
    this.expanded.update((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    return n.item.type === "Feature"
      ? "feature"
      : n.item.type === "User Story"
        ? "story"
        : "task";
  }
  occupied(n: PlanNode, absolute: number) {
    return (
      !!n.visibleInterval &&
      absolute >= n.visibleInterval[0] &&
      absolute <= n.visibleInterval[1]
    );
  }
  gap(n: PlanNode, absolute: number) {
    return n.taskSprints.length
      ? !n.taskSprints.includes(absolute)
      : !n.activeSprints.includes(absolute);
  }
  tooltip(n: PlanNode) {
    const names = n.activeSprints
      .map((i) => this.sprints()[i]?.name)
      .join(", ");
    return `${n.item.type} #${n.item.id}: ${n.item.title}\n状態: ${n.item.state} / 担当: ${n.item.assignedTo || "未割当"}\n自身のIteration: ${n.item.iterationPath}\n既知の期間: ${n.interval ? this.sprints()[n.interval[0]]?.start + " ～ " + this.sprints()[n.interval[1]]?.finish : "未計画"}\n集約元Sprint: ${names}\n取得した子TaskとUS自身の有効Sprintを集約。範囲外の子Taskは未取得。`;
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
