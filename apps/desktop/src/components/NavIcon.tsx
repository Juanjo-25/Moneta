import type { SectionId } from "../types";

const iconPaths: Record<SectionId, string[]> = {
  dashboard: ["M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
  sales: ["M6 2h12l2 6H4z", "M4 8v12h16V8", "M9 13h6"],
  purchases: ["M2 3h3l3 12h11l2-8H6", "M9 20h.01", "M18 20h.01"],
  products: ["M21 8l-9-5-9 5 9 5z", "M3 8v8l9 5 9-5V8", "M12 13v8"],
  "cash-receipts": ["M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z", "M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"],
  receivables: ["M4 4h16v16H4z", "M4 10h16", "M10 10v10"],
  "credit-notes": ["M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z", "M14 3v5h5", "M9 14h6"],
  customers: ["M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z", "M2 20c1-4 4-6 7-6s6 2 7 6", "M16 4.5a3.5 3.5 0 0 1 0 7", "M22 20c-.6-2.6-2-4.4-4-5.3"],
  suppliers: ["M3 21V9l6-4v4l6-4v4l6-4v16z"],
  reports: ["M4 20V10", "M10 20V4", "M16 20v-8", "M22 20H2"],
  settings: ["M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", "M12 2v3", "M12 19v3", "M4.2 4.2l2.1 2.1", "M17.7 17.7l2.1 2.1", "M2 12h3", "M19 12h3", "M4.2 19.8l2.1-2.1", "M17.7 6.3l2.1-2.1"]
};

export function NavIcon({ section }: { section: SectionId }) {
  return (
    <svg
      aria-hidden="true"
      className="nav-icon"
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="18"
    >
      {(iconPaths[section] ?? []).map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}
