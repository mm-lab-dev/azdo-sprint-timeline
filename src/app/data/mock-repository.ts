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
    return {
      items,
      seedIds:
        this.scenario === "empty"
          ? []
          : seedItems(items, "Demo", settings.areas, selected).map((i) => i.id),
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
