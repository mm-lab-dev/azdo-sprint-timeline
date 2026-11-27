import {
  Assignee,
  Filters,
  WorkItemType,
  workItemTypes,
} from "../domain/model";
import { unassignedId } from "../domain/assignee";

export interface FilterScope {
  hostId: string;
  projectId: string;
  userId: string;
}
export interface SavedFilters {
  types: WorkItemType[];
  states: string[] | null;
  assignees: string[] | null;
  assigneeNames: Record<string, string>;
}
export const defaultFilters = (): SavedFilters => ({
  types: ["Feature", "User Story", "Bug", "Task"],
  states: null,
  assignees: null,
  assigneeNames: {},
});
export function filterStorageKey(scope: FilterScope, teamId: string): string {
  return (
    "azdo-sprint-timeline.filters.v1:" +
    JSON.stringify([scope.hostId, scope.projectId, scope.userId, teamId])
  );
}
function stringList(value: unknown): string[] | undefined {
  return Array.isArray(value) &&
    value.every((v) => typeof v === "string" && v.length > 0)
    ? [...new Set(value)]
    : undefined;
}
export function parseFilters(raw: string | null): SavedFilters {
  const fallback = defaultFilters();
  try {
    const value: unknown = JSON.parse(raw || "null");
    if (
      !value ||
      typeof value !== "object" ||
      !("version" in value) ||
      value.version !== 1
    )
      return fallback;
    const record = value as Record<string, unknown>;
    const types = stringList(record["types"]);
    const assignees = stringList(record["assignees"]);
    const names = record["assigneeNames"];
    return {
      types: types?.every((type) =>
        workItemTypes.includes(type as WorkItemType),
      )
        ? (types as WorkItemType[])
        : fallback.types,
      states: stringList(record["states"]) ?? null,
      assignees: assignees ?? null,
      assigneeNames:
        names && typeof names === "object" && !Array.isArray(names)
          ? Object.fromEntries(
              Object.entries(names).filter(
                ([id, name]) =>
                  assignees?.includes(id) &&
                  id !== unassignedId &&
                  typeof name === "string" &&
                  name.length > 0,
              ),
            )
          : {},
    };
  } catch {
    return fallback;
  }
}

export class FilterPreferences {
  private readonly memory = new Map<string, SavedFilters>();
  constructor(
    private readonly scope: FilterScope,
    private readonly storage: () => Pick<Storage, "getItem" | "setItem"> = () =>
      localStorage,
  ) {}
  read(teamId: string): SavedFilters {
    const key = filterStorageKey(this.scope, teamId);
    const cached = this.memory.get(key);
    if (cached) return cached;
    let value = defaultFilters();
    try {
      value = parseFilters(this.storage().getItem(key));
    } catch {
      /* Storage can be blocked in an iframe. */
    }
    this.memory.set(key, value);
    return value;
  }
  save(teamId: string, filters: Filters, people: Assignee[]): SavedFilters {
    const value: SavedFilters = {
      types: [...filters.types],
      states: filters.states === null ? null : [...filters.states],
      assignees: filters.assignees === null ? null : [...filters.assignees],
      assigneeNames: Object.fromEntries(
        people
          .filter(
            (p) => p.id !== unassignedId && filters.assignees?.includes(p.id),
          )
          .map((p) => [p.id, p.name]),
      ),
    };
    const key = filterStorageKey(this.scope, teamId);
    this.memory.set(key, value);
    try {
      this.storage().setItem(key, JSON.stringify({ version: 1, ...value }));
    } catch {
      /* Keep the selection in memory when storage is unavailable. */
    }
    return value;
  }
}
