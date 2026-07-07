type DataTableHeaderProps = {
  labels: string[];
};

export function DataTableHeader({ labels }: DataTableHeaderProps) {
  return (
    <thead>
      <tr>
        {labels.map((label) => (
          <th key={label}>{label}</th>
        ))}
      </tr>
    </thead>
  );
}
