import { SummaryCard } from "./SummaryCard";

type CompactSummaryItem = {
  label: string;
  value: string;
};

type CompactSummaryGridProps = {
  ariaLabel: string;
  items: CompactSummaryItem[];
};

export function CompactSummaryGrid({
  ariaLabel,
  items
}: CompactSummaryGridProps) {
  return (
    <div className="cartera-summary" aria-label={ariaLabel}>
      {items.map((item) => (
        <SummaryCard compact key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}
