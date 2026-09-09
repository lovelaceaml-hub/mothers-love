/**
 * A small, deterministic budget for the visual Garden.
 *
 * The amount configured by an owner describes the content pool, not the
 * number of DOM nodes that a browser must create. The plan always caps the
 * rendered set before a caller creates visual elements.
 */

export type GardenAmount = "all-active" | number;

export interface DisplayRenderBudget {
  maxGardenNodes: number;
  maxDecorationNodes: number;
  maxConnections: number;
}

export const DEFAULT_DISPLAY_RENDER_BUDGET: Readonly<DisplayRenderBudget> = {
  maxGardenNodes: 12,
  maxDecorationNodes: 16,
  maxConnections: 18,
};

export interface GardenRenderBudgetInput {
  availableCount: number;
  gardenAmount: GardenAmount;
  budget?: Partial<DisplayRenderBudget>;
}

export interface GardenRenderBudgetPlan {
  availableCount: number;
  requestedCount: number | "all-active";
  renderedCount: number;
  maxGardenNodes: number;
  maxDecorationNodes: number;
  maxConnections: number;
  bounded: boolean;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || value === undefined) return fallback;
  return Math.max(0, Math.floor(value));
}

function resolveBudget(overrides?: Partial<DisplayRenderBudget>): DisplayRenderBudget {
  return {
    maxGardenNodes: positiveInteger(overrides?.maxGardenNodes, DEFAULT_DISPLAY_RENDER_BUDGET.maxGardenNodes),
    maxDecorationNodes: positiveInteger(overrides?.maxDecorationNodes, DEFAULT_DISPLAY_RENDER_BUDGET.maxDecorationNodes),
    maxConnections: positiveInteger(overrides?.maxConnections, DEFAULT_DISPLAY_RENDER_BUDGET.maxConnections),
  };
}

function normalizeAmount(amount: GardenAmount): number | "all-active" {
  if (amount === "all-active") return amount;
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.floor(amount));
}

export function planGardenRender(input: GardenRenderBudgetInput): GardenRenderBudgetPlan {
  const availableCount = positiveInteger(input.availableCount, 0);
  const budget = resolveBudget(input.budget);
  const requestedCount = normalizeAmount(input.gardenAmount);
  const requestedVisibleCount = requestedCount === "all-active"
    ? availableCount
    : Math.min(availableCount, requestedCount);
  const renderedCount = Math.min(requestedVisibleCount, budget.maxGardenNodes);

  return {
    availableCount,
    requestedCount,
    renderedCount,
    maxGardenNodes: budget.maxGardenNodes,
    maxDecorationNodes: budget.maxDecorationNodes,
    maxConnections: Math.min(budget.maxConnections, Math.floor((renderedCount * Math.max(0, renderedCount - 1)) / 2)),
    bounded: renderedCount <= budget.maxGardenNodes,
  };
}

export function boundedGardenCount(
  availableCount: number,
  gardenAmount: GardenAmount,
  budget?: Partial<DisplayRenderBudget>,
): number {
  return planGardenRender({ availableCount, gardenAmount, budget }).renderedCount;
}

export const getGardenRenderPlan = planGardenRender;
