type StatusBadgeTone = "ok" | "warning" | "active" | "inactive";

type StatusBadgeProps = {
  children: string;
  tone: StatusBadgeTone;
  variant?: "status" | "pill" | undefined;
};

export function StatusBadge({
  children,
  tone,
  variant = "status"
}: StatusBadgeProps) {
  const baseClassName = variant === "pill" ? "status-pill" : "status";

  return <span className={`${baseClassName} ${tone}`}>{children}</span>;
}
