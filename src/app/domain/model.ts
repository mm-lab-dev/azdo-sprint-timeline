export interface Sprint {
  id: string;
  name: string;
  path: string;
  start: string;
  finish: string;
}
export interface Area {
  path: string;
  includeChildren: boolean;
}
export interface Team {
  id: string;
  name: string;
}
export interface Item {
  id: number;
  type: string;
  title: string;
  state: string;
  iterationPath: string;
  areaPath: string;
  project: string;
  parentId?: number;
  assignedTo?: string;
  assignedToId?: string;
  assignedToAvatar?: string;
  remainingWork?: number;
  originalEstimate?: number;
}
export const workItemTypes = [
  "Epic",
  "Feature",
  "User Story",
  "Bug",
  "Task",
] as const;
export type WorkItemType = (typeof workItemTypes)[number];
export interface PlanOptions {
  includeEpics?: boolean;
}
export interface Assignee {
  id: string;
  name: string;
  imageUrl?: string;
}
export type Interval = [number, number];
export interface Effort {
  remaining: number;
  original: number;
  estimatedCount: number;
  missingCount: number;
}
export interface PlanNode {
  item: Item;
  children: PlanNode[];
  activeSprints: number[];
  taskSprints: number[];
  interval: Interval | null;
  visibleInterval: Interval | null;
  orphan: boolean;
  effort: Effort;
}
export interface Plan {
  roots: PlanNode[];
  warnings: string[];
  hierarchyWarnings: string[];
}
export interface GraphResult {
  items: Item[];
  seedIds: number[];
  warnings: string[];
}
export interface TeamSettings {
  sprints: Sprint[];
  areas: Area[];
  warnings: string[];
}
export interface Filters {
  search: string;
  types: WorkItemType[];
  states: string[] | null;
  assignees: string[] | null;
}
export interface Row {
  key: string;
  node: PlanNode;
  members: PlanNode[];
  depth: number;
  hasChildren: boolean;
  orphanGroupStart?: boolean;
}
