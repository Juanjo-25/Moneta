/**
 * Sugerencias de inventario (solo informativas).
 *
 * Modelo: revisión periódica Min/Máx con stock de seguridad.
 *   SS  = z × σd × √(L + R)
 *   Min = d̄ × L + SS
 *   Max = d̄ × (L + R) + SS
 * El nivel de servicio (z) depende de la clase ABC del producto.
 * Nada de esto modifica datos: solo produce recomendaciones.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type DemandMovement = {
  productId: string;
  quantity: number;
  occurredAtMs: number;
  revenueMinor?: number;
};

export type SuggestionProductInput = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  stock: number;
  minimumStock: number;
  costMinor: number;
  active: boolean;
};

export type InventorySuggestionSettings = {
  /** Días que tarda el proveedor en entregar (L). */
  leadTimeDays: number;
  /** Cada cuántos días se hace un pedido (R). */
  reviewPeriodDays: number;
  /** Ventana de análisis en días. */
  windowDays: number;
};

export type AbcClass = "A" | "B" | "C";
export type XyzClass = "X" | "Y" | "Z";
export type SuggestionStatus = "review" | "ok" | "excess" | "no-sales";
export type SuggestionConfidence = "high" | "medium" | "low";
export type DemandTrend = "up" | "down" | "stable";

export type InventorySuggestion = {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  stock: number;
  currentMinimumStock: number;
  abcClass: AbcClass;
  xyzClass: XyzClass;
  serviceLevelPercent: number;
  averageDailyDemand: number;
  averageWeeklyDemand: number;
  coverageDays: number | null;
  safetyStock: number;
  suggestedMin: number;
  suggestedMax: number;
  suggestedOrderQuantity: number;
  suggestedOrderCostMinor: number;
  excessUnits: number;
  status: SuggestionStatus;
  confidence: SuggestionConfidence;
  trend: DemandTrend;
  historyDays: number;
  saleDays: number;
  revenueMinor: number;
};

export const DEFAULT_INVENTORY_SUGGESTION_SETTINGS: InventorySuggestionSettings = {
  leadTimeDays: 7,
  reviewPeriodDays: 7,
  windowDays: 90
};

const SERVICE_LEVELS: Record<AbcClass, { percent: number; z: number }> = {
  A: { percent: 98, z: 2.05 },
  B: { percent: 95, z: 1.65 },
  C: { percent: 90, z: 1.28 }
};

function startOfDayMs(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Clasifica por participación acumulada en ingresos: A ≤ 80%, B ≤ 95%, C resto. */
export function classifyAbc(revenueByProduct: Map<string, number>): Map<string, AbcClass> {
  const result = new Map<string, AbcClass>();
  const sorted = [...revenueByProduct.entries()].sort((left, right) => right[1] - left[1]);
  const total = sorted.reduce((sum, [, revenue]) => sum + Math.max(0, revenue), 0);

  let accumulated = 0;
  for (const [productId, revenue] of sorted) {
    if (total <= 0 || revenue <= 0) {
      result.set(productId, "C");
      continue;
    }
    const shareBefore = accumulated / total;
    accumulated += revenue;
    result.set(productId, shareBefore < 0.8 ? "A" : shareBefore < 0.95 ? "B" : "C");
  }

  return result;
}

export function classifyXyz(coefficientOfVariation: number): XyzClass {
  if (coefficientOfVariation <= 0.5) return "X";
  if (coefficientOfVariation <= 1) return "Y";
  return "Z";
}

export function buildInventorySuggestions(input: {
  products: SuggestionProductInput[];
  sales: DemandMovement[];
  returns?: DemandMovement[];
  nowMs: number;
  settings?: Partial<InventorySuggestionSettings>;
}): InventorySuggestion[] {
  const settings = { ...DEFAULT_INVENTORY_SUGGESTION_SETTINGS, ...input.settings };
  const leadTime = Math.max(0, settings.leadTimeDays);
  const reviewPeriod = Math.max(0, settings.reviewPeriodDays);
  const windowDays = Math.max(7, Math.round(settings.windowDays));
  const todayStart = startOfDayMs(input.nowMs);
  const windowStart = todayStart - (windowDays - 1) * DAY_MS;
  const windowEnd = todayStart + DAY_MS;

  const inWindow = (movement: DemandMovement) =>
    movement.occurredAtMs >= windowStart && movement.occurredAtMs < windowEnd;

  const dailyByProduct = new Map<string, Map<number, number>>();
  const revenueByProduct = new Map<string, number>();
  const firstMovementByProduct = new Map<string, number>();

  function addMovement(movement: DemandMovement, sign: 1 | -1) {
    const days = dailyByProduct.get(movement.productId) ?? new Map<number, number>();
    const dayIndex = Math.floor((startOfDayMs(movement.occurredAtMs) - windowStart) / DAY_MS);
    days.set(dayIndex, (days.get(dayIndex) ?? 0) + sign * movement.quantity);
    dailyByProduct.set(movement.productId, days);
    revenueByProduct.set(
      movement.productId,
      (revenueByProduct.get(movement.productId) ?? 0) + sign * (movement.revenueMinor ?? 0)
    );
  }

  for (const movement of input.sales) {
    const first = firstMovementByProduct.get(movement.productId);
    if (first === undefined || movement.occurredAtMs < first) {
      firstMovementByProduct.set(movement.productId, movement.occurredAtMs);
    }
    if (inWindow(movement)) addMovement(movement, 1);
  }
  for (const movement of input.returns ?? []) {
    if (inWindow(movement)) addMovement(movement, -1);
  }

  const activeProducts = input.products.filter((product) => product.active);
  const abcRevenue = new Map(
    activeProducts.map((product) => [product.id, revenueByProduct.get(product.id) ?? 0])
  );
  const abcByProduct = classifyAbc(abcRevenue);

  return activeProducts.map((product) => {
    const firstMovement = firstMovementByProduct.get(product.id);
    const historyStart =
      firstMovement === undefined ? todayStart : Math.max(windowStart, startOfDayMs(firstMovement));
    const historyDays = Math.max(1, Math.round((windowEnd - historyStart) / DAY_MS));
    const firstDayIndex = windowDays - historyDays;

    const days = dailyByProduct.get(product.id) ?? new Map<number, number>();
    const daily: number[] = [];
    let netDemand = 0;
    for (let index = firstDayIndex; index < windowDays; index += 1) {
      const value = days.get(index) ?? 0;
      netDemand += value;
      daily.push(Math.max(0, value));
    }

    // Las devoluciones restan del total aunque caigan en un día distinto a la venta.
    const totalDemand = Math.max(0, netDemand);
    const saleDays = daily.filter((value) => value > 0).length;
    const averageDailyDemand = totalDemand / historyDays;

    // Variabilidad semanal (más estable que la diaria) convertida a diaria.
    const weekly: number[] = [];
    for (let end = daily.length; end > 0; end -= 7) {
      const start = Math.max(0, end - 7);
      if (end - start < 7 && weekly.length > 0) break; // ignora semana incompleta inicial
      weekly.push(daily.slice(start, end).reduce((sum, value) => sum + value, 0));
    }
    const weeklyMean = weekly.length
      ? weekly.reduce((sum, value) => sum + value, 0) / weekly.length
      : 0;
    const weeklyDeviation = standardDeviation(weekly);
    const dailyDeviation = weeklyDeviation / Math.sqrt(7);
    const coefficientOfVariation = weeklyMean > 0 ? weeklyDeviation / weeklyMean : 0;

    const abcClass = abcByProduct.get(product.id) ?? "C";
    const xyzClass = totalDemand > 0 ? classifyXyz(coefficientOfVariation) : "Z";
    const serviceLevel = SERVICE_LEVELS[abcClass];

    const safetyStockRaw = serviceLevel.z * dailyDeviation * Math.sqrt(leadTime + reviewPeriod);
    const safetyStock = totalDemand > 0 ? Math.ceil(safetyStockRaw) : 0;
    const suggestedMin =
      totalDemand > 0 ? Math.max(1, Math.ceil(averageDailyDemand * leadTime + safetyStockRaw)) : 0;
    const suggestedMax =
      totalDemand > 0
        ? Math.max(
            suggestedMin,
            Math.ceil(averageDailyDemand * (leadTime + reviewPeriod) + safetyStockRaw)
          )
        : 0;

    const stock = Math.max(0, product.stock);
    const coverageDays = averageDailyDemand > 0 ? stock / averageDailyDemand : null;
    const suggestedOrderQuantity =
      totalDemand > 0 && stock <= suggestedMin ? Math.max(0, suggestedMax - stock) : 0;
    const excessThreshold = suggestedMax * 2;
    const excessUnits =
      totalDemand > 0 && stock > excessThreshold ? stock - suggestedMax : 0;

    let status: SuggestionStatus;
    if (totalDemand <= 0) status = "no-sales";
    else if (stock <= suggestedMin) status = "review";
    else if (excessUnits > 0) status = "excess";
    else status = "ok";

    let confidence: SuggestionConfidence = "low";
    if (historyDays >= 60 && saleDays >= 8) confidence = "high";
    else if (historyDays >= 30 && saleDays >= 3) confidence = "medium";

    // Tendencia: últimos 30 días frente al promedio de los días anteriores.
    let trend: DemandTrend = "stable";
    if (daily.length >= 45) {
      const recent = daily.slice(-30);
      const previous = daily.slice(0, -30);
      const recentAverage = recent.reduce((sum, value) => sum + value, 0) / recent.length;
      const previousAverage = previous.reduce((sum, value) => sum + value, 0) / previous.length;
      if (previousAverage > 0) {
        const change = (recentAverage - previousAverage) / previousAverage;
        if (change >= 0.2) trend = "up";
        else if (change <= -0.2) trend = "down";
      } else if (recentAverage > 0) {
        trend = "up";
      }
    }

    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      stock,
      currentMinimumStock: product.minimumStock,
      abcClass,
      xyzClass,
      serviceLevelPercent: serviceLevel.percent,
      averageDailyDemand,
      averageWeeklyDemand: averageDailyDemand * 7,
      coverageDays,
      safetyStock,
      suggestedMin,
      suggestedMax,
      suggestedOrderQuantity,
      suggestedOrderCostMinor: suggestedOrderQuantity * product.costMinor,
      excessUnits,
      status,
      confidence,
      trend,
      historyDays,
      saleDays,
      revenueMinor: revenueByProduct.get(product.id) ?? 0
    };
  });
}
