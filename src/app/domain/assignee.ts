import { Assignee, Item } from "./model";
export const unassignedId = "__unassigned__";
export function assigneeOf(item: Item): Assignee {
  return {
    id: item.assignedToId || item.assignedTo || unassignedId,
    name: item.assignedTo || "未割当",
    imageUrl: item.assignedToAvatar,
  };
}
