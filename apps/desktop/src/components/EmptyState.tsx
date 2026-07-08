type EmptyStateProps = {
  body: string;
  className?: string | undefined;
  heading?: string | undefined;
  title: string;
};

export function EmptyState({
  body,
  className = "",
  heading,
  title
}: EmptyStateProps) {
  const classNames = ["empty-state", className].filter(Boolean).join(" ");

  return (
    <div className={classNames}>
      <div className="empty-state-copy">
        {heading ? <h2>{heading}</h2> : null}
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
    </div>
  );
}
