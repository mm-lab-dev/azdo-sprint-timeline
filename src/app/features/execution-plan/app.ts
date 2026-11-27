import { Localization } from "../../i18n/localization";
import {
  defaultFilters,
  FilterPreferences,
  FilterScope,
} from "../../preferences/filter-preferences";
import {
  Diagnostic,
  Message,
  MessageKey,
  message,
  translate,
  uniqueMessages,
} from "../../i18n/messages";
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
import { assigneeOf, unassignedId } from "../../domain/assignee";
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
export const FILTER_SCOPE = new InjectionToken<FilterScope>("filter scope");
export function errorMessage(
  error: unknown,
  language: "ja" | "en" = "ja",
): string {
  const e = error as { status?: number; statusCode?: number };
  const status = e?.status ?? e?.statusCode;
  const text = translate(
    status === 403 || status === 401
      ? "permissionError"
      : status === 429
        ? "rateLimitError"
        : "networkError",
    language,
  );
  return typeof status === "number" && status > 0
    ? text + translate("httpStatus", language, { status })
    : text;
}
@Component({
  selector: "app-root",
  standalone: true,
  imports: [FormsModule, InputTextModule, AssigneeAvatar],
  templateUrl: "./app.html",
})
export class App {
  private readonly repository = inject(REPOSITORY);
  private readonly preferences = new FilterPreferences(inject(FILTER_SCOPE));
  private preferenceTeam = "";
  private readonly savedAssigneeNames = signal<Record<string, string>>({});
  readonly i18n = inject(Localization);
  readonly t = this.i18n.t;
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
  readonly error = signal<{
    cause?: unknown;
    stage?: MessageKey;
    range?: boolean;
  } | null>(null);
  readonly errorText = computed(() => {
    const error = this.error();
    if (!error) return "";
    if (error.range) return this.t("rangeError");
    return (
      (error.stage ? this.t(error.stage) + ": " : "") +
      errorMessage(error.cause, this.i18n.language())
    );
  });
  readonly settingsWarnings = signal<Diagnostic[]>([]);
  readonly notice = signal<Message | null>(null);
  readonly filters = signal<Filters>({
    search: "",
    ...defaultFilters(),
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
      `var(--item-column, 420px) repeat(${this.selectedSprints().length}, 150px)`,
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
    [
      ...new Set([
        ...this.plannedItems().map((i) => i.state),
        ...(this.filters().states ?? []),
      ]),
    ].sort(),
  );
  readonly assignees = computed(() => {
    const people = new Map(
      this.plannedItems().map((i) => {
        const person = this.localizedPerson(i);
        return [person.id, person] as const;
      }),
    );
    for (const id of this.filters().assignees ?? []) {
      if (!people.has(id))
        people.set(id, {
          id,
          name:
            id === unassignedId
              ? this.t("unassigned")
              : this.savedAssigneeNames()[id] || id,
        });
    }
    return [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
  });
  readonly retrievalWarnings = computed(() =>
    uniqueMessages(this.graph().warnings),
  );
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
    this.error.set(null);
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
        this.error.set({ cause: e, stage: "teamsStage" });
        this.loading.set(false);
      }
    }
  }
  async changeTeam(id: string) {
    const version = ++this.generation;
    if (id !== this.preferenceTeam) {
      const saved = this.preferences.read(id);
      this.savedAssigneeNames.set(saved.assigneeNames);
      this.filters.update((f) => ({
        ...f,
        types: saved.types,
        states: saved.states,
        assignees: saved.assignees,
      }));
      this.preferenceTeam = id;
    }
    this.teamId.set(id);
    this.loading.set(true);
    this.error.set(null);
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
        this.error.set({ cause: e, stage: "settingsStage" });
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
    this.error.set(null);
    this.notice.set(null);
    this.graph.set({ items: [], seedIds: [], warnings: [] });
    if (this.range()[0] > this.range()[1]) {
      this.error.set({ range: true });
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
      if (version === this.generation) this.error.set({ cause: e });
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
    if (key !== "search") this.saveFilters();
  }
  toggleType(type: WorkItemType) {
    this.filters.update((f) => ({
      ...f,
      types: f.types.includes(type)
        ? f.types.filter((t) => t !== type)
        : [...f.types, type],
    }));
    this.saveFilters();
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
    this.saveFilters();
  }
  private saveFilters() {
    if (!this.teamId()) return;
    const saved = this.preferences.save(
      this.teamId(),
      this.filters(),
      this.assignees(),
    );
    this.savedAssigneeNames.set(saved.assigneeNames);
  }
  filterCaption(key: "states" | "assignees") {
    const selected = this.filters()[key];
    return selected === null
      ? this.t("all")
      : selected.length
        ? this.t("selected", { count: selected.length })
        : this.t("noneSelected");
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
          : n.item.type === "Bug"
            ? "bug"
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
          const p = this.localizedPerson(n.item);
          return [p.id, p] as const;
        }),
      ).values(),
    ].filter((person) => person.id !== unassignedId);
  }
  private localizedPerson(item: PlanNode["item"]): Assignee {
    const person = assigneeOf(item);
    return person.id === unassignedId
      ? { ...person, name: this.t("unassigned") }
      : person;
  }
  personOf(node: PlanNode) {
    return this.localizedPerson(node.item);
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
    const percent = members.every((n) => n.item.type === "Task")
      ? completionPercent(effort)
      : null;
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
    if (!members.every((n) => n.item.type === "Task")) return "";
    const p = this.progress(members);
    return p.percent === null
      ? this.t("progressUnavailable")
      : this.t("progressDetails", {
          value: p.label,
          original: p.original,
          remaining: p.remaining,
        }) +
          (p.partial
            ? this.t("partialProgress", { count: p.missingCount })
            : "");
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
    return [
      n.item.type + " #" + n.item.id + ": " + n.item.title,
      this.t("tooltipState", {
        state: n.item.state,
        name: this.personOf(n).name,
      }),
      this.t("tooltipIteration", { path: n.item.iterationPath }),
      this.t("tooltipPeriod", {
        period: n.interval
          ? this.sprints()[n.interval[0]]?.start +
            " ～ " +
            this.sprints()[n.interval[1]]?.finish
          : this.t("unplanned"),
      }),
      this.t("tooltipSprints", { names }),
      ...(n.item.type === "Task" ? [this.progressTitle([n])] : []),
      this.t("tooltipScope"),
    ].join("\n");
  }

  async open(id: number) {
    try {
      await this.repository.openItem(id);
      if (this.mock) this.notice.set(message("mockOpened", { id }));
    } catch {
      this.notice.set(message("openFailed"));
    }
  }
}
