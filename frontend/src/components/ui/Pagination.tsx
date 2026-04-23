import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "./Button";

export function Pagination({
  page,
  totalItems,
  pageSize = 10,
  onPageChange
}: {
  page: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const canPrevious = page > 1;
  const canNext = page < totalPages;

  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
      <p className="text-xs font-medium text-slate-600">
        Affichage {start}-{end} sur {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-9 rounded-xl px-3 py-1.5 text-xs"
          disabled={!canPrevious}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Precedent
        </Button>
        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="h-9 rounded-xl px-3 py-1.5 text-xs"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
