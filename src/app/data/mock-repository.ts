import { items, sprints, teams } from "../../../fixtures/mock";
import { largeItems, largeSprints } from "../../../fixtures/large";
import { GraphResult, Sprint, TeamSettings } from "../domain/model";
import { seedItems } from "../domain/plan";
import { PlanRepository } from "./repository";
export class MockRepository implements PlanRepository {
  constructor(private scenario = "") {}
  async teams() {
    return teams;
  }
  async settings(teamId: string): Promise<TeamSettings> {
    if (this.scenario === "large")
      return {
        sprints: largeSprints,
        areas: [{ path: "Demo\\Platform", includeChildren: true }],
        warnings: [],
      };
    return {
      sprints,
      areas: [
        {
          path: teamId === "alpha" ? "Demo\\Platform" : "Demo\\Experience",
          includeChildren: true,
        },
      ],
      warnings: [],
    };
  }
  async load(teamId: string, selected: Sprint[]): Promise<GraphResult> {
    await new Promise((resolve) =>
      setTimeout(resolve, this.scenario === "slow" ? 500 : 30),
    );
    if (["403", "429", "network"].includes(this.scenario))
      throw Object.assign(new Error("Mock error"), {
        status: this.scenario === "network" ? 0 : Number(this.scenario),
      });
    const settings = await this.settings(teamId);
    if (this.scenario === "large")
      return {
        items: largeItems,
        seedIds: seedItems(largeItems, "Demo", settings.areas, selected).map(
          (i) => i.id,
        ),
        warnings: [],
      };
    const plannedItems = ["epic", "grouped"].includes(this.scenario)
      ? items.filter((i) => i.id !== 106)
      : items;
    const base = (id: number) => items.find((i) => i.id === id)!;
    let data =
      this.scenario === "grouped"
        ? [
            ...plannedItems,
            {
              ...base(201),
              id: 207,
              iterationPath: sprints[2].path,
              assignedTo: "Ren",
              assignedToAvatar: "assets/avatars/ren.png",
              state: "Closed",
            },
            {
              ...base(201),
              id: 208,
              parentId: 102,
              iterationPath: sprints[3].path,
            },
            {
              ...base(101),
              id: 107,
              iterationPath: sprints[2].path,
              assignedTo: "Mina",
              assignedToAvatar: "assets/avatars/mina.png",
              state: "New",
            },
            {
              ...base(201),
              id: 209,
              parentId: 107,
              title: "結合したStoryの子Task",
              iterationPath: sprints[3].path,
            },
            {
              ...base(101),
              id: 401,
              parentId: undefined,
              title: "独立した計画",
              iterationPath: sprints[1].path,
            },
            {
              ...base(101),
              id: 402,
              parentId: undefined,
              title: "独立した計画",
              iterationPath: sprints[3].path,
              assignedTo: "Ren",
              assignedToAvatar: "assets/avatars/ren.png",
            },
            {
              ...base(201),
              id: 403,
              parentId: undefined,
              title: "独立した計画",
              iterationPath: sprints[2].path,
            },
          ]
        : plannedItems;
    if (this.scenario === "progress")
      data = data.map((i) =>
        i.id === 201
          ? { ...i, originalEstimate: 10, remainingWork: 5 }
          : i.id === 202
            ? { ...i, originalEstimate: 10, remainingWork: -2 }
            : i.id === 204
              ? { ...i, originalEstimate: 10, remainingWork: 15 }
              : i.id === 205
                ? { ...i, originalEstimate: 0, remainingWork: 0 }
                : i.id === 206
                  ? {
                      ...i,
                      originalEstimate: undefined,
                      remainingWork: undefined,
                    }
                  : i,
      );
    return {
      items:
        this.scenario === "epic"
          ? [
              ...plannedItems
                .filter((i) => i.id !== 900)
                .map((i) =>
                  i.type === "Feature" ? { ...i, parentId: 900 } : i,
                ),
              {
                ...items[0],
                id: 900,
                type: "Epic",
                title: "表示範囲より上のEpic",
                parentId: 999,
              },
            ]
          : data,
      seedIds:
        this.scenario === "empty"
          ? []
          : seedItems(data, "Demo", settings.areas, selected).map((i) => i.id),
      warnings:
        this.scenario === "partial"
          ? ["部分取得: 一部の項目を取得できませんでした。"]
          : [],
    };
  }
  async openItem(id: number) {
    window.dispatchEvent(new CustomEvent("mock-open-item", { detail: id }));
  }
}
