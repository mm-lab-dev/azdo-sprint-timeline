import { message } from "../i18n/messages";
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
    const plannedItems = ["epic", "grouped", "bugs"].includes(this.scenario)
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
    if (this.scenario === "bugs") {
      const bug = {
        ...base(101),
        type: "Bug",
        assignedTo: undefined,
        assignedToId: undefined,
        assignedToAvatar: undefined,
        originalEstimate: 10,
        remainingWork: 5,
      };
      const task = {
        ...base(201),
        parentId: 501,
        assignedTo: undefined,
        assignedToAvatar: undefined,
        originalEstimate: 10,
        remainingWork: 4,
      };
      data = [
        ...data,
        {
          ...bug,
          id: 501,
          title: "通知の重複を修正する",
          iterationPath: "Demo",
        },
        {
          ...bug,
          id: 502,
          title: "入力エラーを修正する",
          iterationPath: sprints[2].path,
        },
        {
          ...bug,
          id: 504,
          title: "入力エラーを修正する",
          iterationPath: sprints[3].path,
          assignedTo: "Ren",
          assignedToAvatar: "assets/avatars/ren.png",
        },
        {
          ...bug,
          id: 505,
          title: "独立した不具合",
          parentId: undefined,
          iterationPath: sprints[2].path,
        },
        { ...bug, id: 506, title: "未計画の不具合", iterationPath: "Demo" },
        {
          ...bug,
          id: 503,
          type: "User Story",
          title: "入力エラーを修正する",
          iterationPath: sprints[2].path,
        },
        {
          ...task,
          id: 601,
          title: "通知の重複テスト",
          iterationPath: sprints[1].path,
        },
        {
          ...task,
          id: 602,
          title: "通知の修正",
          iterationPath: sprints[3].path,
          remainingWork: 2,
          assignedTo: "Ren",
          assignedToAvatar: "assets/avatars/ren.png",
        },
        {
          ...task,
          id: 603,
          title: "通知の重複テスト",
          iterationPath: sprints[1].path,
          remainingWork: 8,
          assignedTo: "Aki",
          assignedToAvatar: "assets/avatars/aki.png",
        },
        {
          ...task,
          id: 604,
          title: "範囲外の修正",
          iterationPath: sprints[4].path,
        },
      ];
    }
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
      warnings: this.scenario === "partial" ? [message("mockPartial")] : [],
    };
  }
  async openItem(id: number) {
    window.dispatchEvent(new CustomEvent("mock-open-item", { detail: id }));
  }
}
