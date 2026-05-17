import { ViewToggle } from "@/components/company-grid/ViewToggle";
import type { CompanyGridView } from "@/components/company-grid/types";

export function CompanyGridSkeleton({
  view,
  showToggle,
  onViewChange,
}: {
  view: CompanyGridView;
  showToggle: boolean;
  onViewChange: (view: CompanyGridView) => void;
}) {
  return (
    <div>
      {showToggle && (
        <div className="nei-company-grid-toolbar">
          <ViewToggle value={view} onChange={onViewChange} />
        </div>
      )}
      <div className="nei-company-skeleton-grid" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="nei-company-skeleton-card" />
        ))}
      </div>
    </div>
  );
}
