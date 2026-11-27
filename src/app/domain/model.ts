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
}
export type Interval = [number, number];
export interface PlanNode {
  item: Item;
  children: PlanNode[];
  activeSprints: number[];
  taskSprints: number[];
  interval: Interval | null;
  visibleInterval: Interval | null;
  orphan: boolean;
}
export interface Plan {
  roots: PlanNode[];
  warnings: string[];
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
  state: string;
  assignee: string;
  mode: "all" | "stories" | "noTasks";
}
export interface Row {
  node: PlanNode;
  depth: number;
  hasChildren: boolean;
  orphanGroupStart?: boolean;
}
