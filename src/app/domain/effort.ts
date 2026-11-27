import { Effort, Item } from "./model";
export const emptyEffort = (): Effort => ({
  remaining: 0,
  original: 0,
  estimatedCount: 0,
  missingCount: 0,
});
export function sumEffort(values: Effort[]): Effort {
  return values.reduce(
    (total, value) => ({
      remaining: total.remaining + value.remaining,
      original: total.original + value.original,
      estimatedCount: total.estimatedCount + value.estimatedCount,
      missingCount: total.missingCount + value.missingCount,
    }),
    emptyEffort(),
  );
}
export function aggregateEffort(item: Item, children: Effort[]): Effort {
  const total = sumEffort(children);
  const valid =
    typeof item.originalEstimate === "number" &&
    Number.isFinite(item.originalEstimate) &&
    item.originalEstimate >= 0 &&
    typeof item.remainingWork === "number" &&
    Number.isFinite(item.remainingWork);
  if (
    item.type === "Task" ||
    (total.estimatedCount + total.missingCount === 0 && valid)
  ) {
    if (valid) {
      total.remaining += item.remainingWork!;
      total.original += item.originalEstimate!;
      total.estimatedCount++;
    } else total.missingCount++;
  }
  return total;
}
export function completionPercent(effort: Effort): number | null {
  if (!effort.estimatedCount || effort.original <= 0) return null;
  return ((effort.original - effort.remaining) / effort.original) * 100;
}
