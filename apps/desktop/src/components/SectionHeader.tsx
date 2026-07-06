import type { ReactNode } from "react";

type SectionHeaderProps = {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function SectionHeader({
  action,
  description,
  eyebrow,
  title
}: SectionHeaderProps) {
  return (
    <header className="topbar">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {action}
    </header>
  );
}
