import type { WorkItem } from "azure-devops-extension-api/WorkItemTracking";
import type {
  TeamSettingsIteration,
  TeamFieldValues,
} from "azure-devops-extension-api/Work";
import {
  Area,
  GraphResult,
  Item,
  PlanOptions,
  Sprint,
  Team,
  TeamSettings,
} from "../domain/model";
import { seedItems, sortSprints } from "../domain/plan";
import { ReadOnlyHttp } from "../core/azure-devops/http";
import { PlanRepository } from "./repository";
export interface Reader {
  request<T>(path: string, body?: unknown): Promise<T>;
}
export const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
export function wiql(project: string, areas: Area[], sprint: Sprint): string {
  if (!areas.length) throw new Error("No team areas");
  const area = areas
    .map((a) =>
      a.includeChildren
        ? `([System.AreaPath] = ${literal(a.path)} OR [System.AreaPath] UNDER ${literal(a.path)})`
        : `[System.AreaPath] = ${literal(a.path)}`,
    )
    .join(" OR ");
  return `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = ${literal(project)} AND [System.WorkItemType] IN ('User Story', 'Bug', 'Task') AND [System.IterationPath] = ${literal(sprint.path)} AND (${area}) ORDER BY [System.Id]`;
}
export function parentId(raw: WorkItem): number | undefined {
  const link = raw.relations?.find(
    (r) => r.rel === "System.LinkTypes.Hierarchy-Reverse",
  );
  if (link) {
    try {
      const url = new URL(link.url);
      const match =
        /^https?:$/.test(url.protocol) &&
        /\/_apis\/wit\/workitems\/(\d+)\/?$/i.exec(url.pathname);
      const n = match ? Number(match[1]) : 0;
      return Number.isSafeInteger(n) && n > 0 ? n : undefined;
    } catch {
      return undefined;
    }
  }
  const n = Number(raw.fields?.["System.Parent"]);
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
}
export function mapItem(raw: WorkItem): Item {
  const f = raw.fields || {};
  const person: unknown = f["System.AssignedTo"];
  const identity =
    person && typeof person === "object"
      ? (person as Record<string, unknown>)
      : undefined;
  const links = identity?.["_links"] as
    { avatar?: { href?: unknown } } | undefined;
  const imageUrl = identity?.["imageUrl"] || links?.avatar?.href;
  const assignedTo =
    typeof person === "string"
      ? person
      : person && typeof person === "object" && "displayName" in person
        ? String(person.displayName)
        : undefined;
  return {
    id: raw.id,
    type: String(f["System.WorkItemType"] || ""),
    title: String(f["System.Title"] || ""),
    state: String(f["System.State"] || ""),
    project: String(f["System.TeamProject"] || ""),
    iterationPath: String(f["System.IterationPath"] || ""),
    areaPath: String(f["System.AreaPath"] || ""),
    parentId: parentId(raw),
    assignedTo,
    assignedToId:
      typeof identity?.["id"] === "string"
        ? identity["id"]
        : typeof identity?.["descriptor"] === "string"
          ? identity["descriptor"]
          : undefined,
    assignedToAvatar:
      typeof imageUrl === "string" && /^https:\/\//i.test(imageUrl)
        ? imageUrl
        : undefined,
    remainingWork:
      typeof f["Microsoft.VSTS.Scheduling.RemainingWork"] === "number"
        ? f["Microsoft.VSTS.Scheduling.RemainingWork"]
        : undefined,
    originalEstimate:
      typeof f["Microsoft.VSTS.Scheduling.OriginalEstimate"] === "number"
        ? f["Microsoft.VSTS.Scheduling.OriginalEstimate"]
        : undefined,
  };
}
export class AzureRepository implements PlanRepository {
  private readonly cachedSettings = new Map<string, TeamSettings>();
  constructor(
    private http: Reader | ReadOnlyHttp,
    private project: { id: string; name: string },
    private navigate: (id: number) => Promise<void>,
  ) {}
  private projectPath() {
    return "/" + encodeURIComponent(this.project.id);
  }
  async teams(): Promise<Team[]> {
    const result = new Map<string, Team>();
    for (let skip = 0; ; skip += 100) {
      const page = await this.http.request<{ value: Team[] }>(
        `/_apis/projects/${encodeURIComponent(this.project.id)}/teams?$top=100&$skip=${skip}`,
      );
      page.value.forEach((t) => result.set(t.id, { id: t.id, name: t.name }));
      if (page.value.length < 100) break;
      if (skip >= 99900) throw new Error("Team pagination limit reached");
    }
    return [...result.values()];
  }
  async settings(teamId: string): Promise<TeamSettings> {
    const path = `${this.projectPath()}/${encodeURIComponent(teamId)}/_apis/work/teamsettings`;
    // Sequential requests keep per-extension concurrency bounded.
    const iterations = await this.http.request<{
      value: TeamSettingsIteration[];
    }>(path + "/iterations");
    const fields = await this.http.request<TeamFieldValues>(
      path + "/teamfieldvalues",
    );
    if (fields.field.referenceName !== "System.AreaPath")
      throw new Error("Unsupported team field");
    const values = iterations.value.map((s) => ({
      id: s.id,
      name: s.name,
      path: s.path,
      start: s.attributes?.startDate
        ? String(s.attributes.startDate).slice(0, 10)
        : "",
      finish: s.attributes?.finishDate
        ? String(s.attributes.finishDate).slice(0, 10)
        : "",
    }));
    const sprints = sortSprints(values);
    const settings: TeamSettings = {
      sprints,
      areas: fields.values.map((a) => ({
        path: a.value,
        includeChildren: a.includeChildren,
      })),
      warnings:
        sprints.length !== values.length
          ? ["日付なし・無効日付・プロジェクト直下のIterationを除外しました。"]
          : [],
    };
    this.cachedSettings.set(teamId, settings);
    return settings;
  }
  async load(
    teamId: string,
    selected: Sprint[],
    options: PlanOptions = {},
  ): Promise<GraphResult> {
    const isBoundary = (item: Item) =>
      item.type === (options.includeEpics ? "Epic" : "Feature");
    const settings =
      this.cachedSettings.get(teamId) || (await this.settings(teamId));
    const warnings: string[] = [];
    if (!settings.areas.length || !selected.length)
      return {
        items: [],
        seedIds: [],
        warnings: ["チームAreaまたはSprintが設定されていません。"],
      };
    const ids = new Set<number>();
    for (const sprint of selected) {
      try {
        const result = await this.http.request<{ workItems: { id: number }[] }>(
          `${this.projectPath()}/_apis/wit/wiql?$top=20000`,
          { query: wiql(this.project.name, settings.areas, sprint) },
        );
        if (result.workItems.length >= 20000)
          warnings.push(
            `部分取得: ${sprint.name} がWIQL上限に達しました。Sprint範囲またはチームAreaを縮小してください。`,
          );
        result.workItems.forEach((i) => ids.add(i.id));
      } catch (e) {
        const server = e as { message?: string; status?: number };
        // A single query is already split by Sprint. Never silently swallow failures.
        if (server.status === 400)
          warnings.push(
            `部分取得: ${sprint.name} の検索失敗（WIQL長/件数上限または設定）。範囲・Area設定を縮小してください。`,
          );
        else throw e;
      }
    }
    const fetched = new Map<number, Item>();
    const attempted = new Set<number>();
    const requestBatch = async (ids: number[]): Promise<WorkItem[]> => {
      const response = await this.http.request<
        { value: WorkItem[] } | WorkItem[]
      >(`${this.projectPath()}/_apis/wit/workitemsbatch`, {
        ids,
        $expand: "Relations",
        errorPolicy: "Omit",
      });
      // REST wraps arrays in { count, value }; SDK clients request noArrayWrap.
      return Array.isArray(response) ? response : response.value;
    };
    const fetchIds = async (requested: number[]) => {
      for (let offset = 0; offset < requested.length; offset += 200) {
        const batch = requested
          .slice(offset, offset + 200)
          .filter((id) => !attempted.has(id));
        if (!batch.length) continue;
        batch.forEach((id) => attempted.add(id));
        let raw: WorkItem[];
        try {
          raw = await requestBatch(batch);
        } catch (e) {
          const status = (e as { status?: number }).status;
          if (status !== 403 && status !== 404) throw e;
          // Fall back only for denied batches to preserve accessible seeds/ancestors.
          raw = [];
          for (const id of batch) {
            try {
              raw.push(...(await requestBatch([id])));
            } catch (error) {
              if (![403, 404].includes((error as { status: number }).status))
                throw error;
            }
          }
        }
        raw.forEach((r) => {
          const item = mapItem(r);
          if (item.project === this.project.name) fetched.set(item.id, item);
          else warnings.push(`別プロジェクトの親 #${item.id} は辿りません。`);
        });
        if (raw.length < batch.length)
          warnings.push(
            `部分取得: ${batch.length - raw.length}件を取得できませんでした（権限不足・削除等）。`,
          );
      }
    };
    await fetchIds([...ids]);
    const seeds = seedItems(
      [...fetched.values()],
      this.project.name,
      settings.areas,
      selected,
    ).map((i) => i.id);
    for (let depth = 0; depth < 64; depth++) {
      const parents = [
        ...new Set(
          [...fetched.values()].flatMap((i) =>
            !isBoundary(i) && i.parentId && !attempted.has(i.parentId)
              ? [i.parentId]
              : [],
          ),
        ),
      ];
      if (!parents.length) break;
      await fetchIds(parents);
      if (
        depth === 63 &&
        [...fetched.values()].some(
          (i) => !isBoundary(i) && i.parentId && !attempted.has(i.parentId),
        )
      )
        warnings.push(
          "祖先探索の深さ上限64に到達しました。未取得の親があります。",
        );
    }
    return { items: [...fetched.values()], seedIds: seeds, warnings };
  }
  openItem(id: number) {
    return this.navigate(id);
  }
}
