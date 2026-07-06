type EmptyStateProps = {
  body: string;
  className?: string | undefined;
  title: string;
};

export function EmptyState({ body, className = "", title }: EmptyStateProps) {
  const classNames = ["empty-state", className].filter(Boolean).join(" ");

  return (
    <div className={classNames}>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}
