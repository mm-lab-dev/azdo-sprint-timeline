import {
  GraphResult,
  PlanOptions,
  Sprint,
  Team,
  TeamSettings,
} from "../domain/model";
export interface PlanRepository {
  teams(): Promise<Team[]>;
  settings(teamId: string): Promise<TeamSettings>;
  load(
    teamId: string,
    selected: Sprint[],
    options?: PlanOptions,
  ): Promise<GraphResult>;
  openItem(id: number): Promise<void>;
}
