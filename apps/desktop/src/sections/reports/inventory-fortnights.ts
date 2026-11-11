/**
 * Pedidos quincenales: un pedido cubre del 1 al 15 de cada mes y otro del 16 a fin de mes.
 *
 * Para cada quincena se calcula cuánto pedir para que, al empezar, el stock alcance a cubrir
 * la venta esperada de esos días más el stock de seguridad. El pedido debe hacerse
 * "tiempo de entrega" días antes de que empiece la quincena para que llegue a tiempo.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type Fortnight = {
  id: string;
  start: Date;
  /** Último día incluido. */
  end: Date;
  days: number;
  /** Fecha límite para hacer el pedido y que llegue al iniciar la quincena. */
  orderBy: Date;
  label: string;
};

export type FortnightDemandInput = {
  stock: number;
  averageDailyDemand: number;
  safetyStock: number;
  hasDemand: boolean;
};

const monthFormatter = new Intl.DateTimeFormat("es-CO", { month: "short" });

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

function shortMonth(date: Date): string {
  return monthFormatter.format(date).replace(".", "");
}

export function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${shortMonth(date)}`;
}

function buildFortnight(year: number, month: number, half: 1 | 2, leadTimeDays: number): Fortnight {
  const start = new Date(year, month, half === 1 ? 1 : 16);
  const end = half === 1 ? new Date(year, month, 15) : new Date(year, month + 1, 0);
  const days = end.getDate() - start.getDate() + 1;
  const orderBy = new Date(start.getFullYear(), start.getMonth(), start.getDate() - leadTimeDays);

  return {
    id: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-q${half}`,
    start,
    end,
    days,
    orderBy,
    label: `${start.getDate()}–${end.getDate()} ${shortMonth(start)}`
  };
}

/** Las dos próximas quincenas cuyo inicio es hoy o posterior. */
export function getUpcomingFortnights(today: Date, leadTimeDays: number): [Fortnight, Fortnight] {
  const candidates: Fortnight[] = [];
  for (let offset = 0; offset < 3; offset += 1) {
    const year = today.getFullYear();
    const month = today.getMonth() + offset;
    candidates.push(buildFortnight(year, month, 1, leadTimeDays));
    candidates.push(buildFortnight(year, month, 2, leadTimeDays));
  }

  const todayStart = startOfDay(today);
  const upcoming = candidates.filter((fortnight) => fortnight.start >= todayStart);
  return [upcoming[0]!, upcoming[1]!];
}

/**
 * Cantidades a pedir para las dos quincenas. Supone que el primer pedido llega completo al
 * iniciar su quincena y que, mientras tanto, se sigue vendiendo al ritmo promedio.
 */
export function planFortnightOrders(
  input: FortnightDemandInput,
  fortnights: [Fortnight, Fortnight],
  today: Date
): [number, number] | null {
  if (!input.hasDemand || input.averageDailyDemand <= 0) return null;

  const [first, second] = fortnights;
  const daily = input.averageDailyDemand;
  const daysUntilFirst = Math.max(0, daysBetween(today, first.start));
  const stockAtFirstStart = Math.max(0, input.stock - daily * daysUntilFirst);
  const firstOrder = Math.max(
    0,
    Math.ceil(daily * first.days + input.safetyStock - stockAtFirstStart - 1e-9)
  );
  const stockAtSecondStart = Math.max(0, stockAtFirstStart + firstOrder - daily * first.days);
  const secondOrder = Math.max(
    0,
    Math.ceil(daily * second.days + input.safetyStock - stockAtSecondStart - 1e-9)
  );

  return [firstOrder, secondOrder];
}
