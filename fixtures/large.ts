import { Item, Sprint } from "../src/app/domain/model";
export const largeSprints: Sprint[] = Array.from({ length: 10 }, (_, i) => ({
  id: `l${i}`,
  name: `Sprint ${i + 1}`,
  path: `Demo\\Large ${i}`,
  start: `2026-${String(i + 1).padStart(2, "0")}-01`,
  finish: `2026-${String(i + 1).padStart(2, "0")}-14`,
}));
export const largeItems: Item[] = Array.from({ length: 1000 }, (_, i) => {
  const id = i + 1;
  return {
    id,
    type: id <= 10 ? "Feature" : id <= 110 ? "User Story" : "Task",
    title: `Performance item ${id}`,
    state: "Active",
    iterationPath: id <= 110 ? "Demo" : largeSprints[i % 10].path,
    areaPath: "Demo\\Platform",
    project: "Demo",
    assignedTo: "Aki",
    ...(id <= 10
      ? {}
      : { parentId: id <= 110 ? 1 + (i % 10) : 11 + (i % 100) }),
  };
});
