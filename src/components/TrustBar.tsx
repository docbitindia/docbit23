import React from 'react';
import type { RawDataset } from '../types/dataset';
import type { ProcessedReport } from '../types/processed';

interface Props {
  raw: RawDataset;
  report: ProcessedReport;
}

export function TrustBar({ raw, report }: Props) {
  const originalRows = report.stats.totalRowsInFile;
  const originalCols = report.stats.totalColumnCount;
  const currentRows = report.stats.finalRowCount;
  const currentCols = report.stats.selectedColumnCount;
  const changed = originalRows !== currentRows || originalCols !== currentCols;

  return (
    <div className="flex items-center gap-x-4 gap-y-1 flex-wrap px-3.5 sm:px-5 py-1.5 text-[10px] border-b border-ink-200 bg-white">
      <span className="flex items-center gap-1.5 text-ink-600/60">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5l5.5 2.6v4c0 3.5-2.3 6.4-5.5 7.4-3.2-1-5.5-3.9-5.5-7.4v-4L8 1.5z" stroke="#15803D" strokeWidth="1.3" />
        </svg>
        Original data preserved — {originalRows.toLocaleString()} rows × {originalCols} columns
      </span>
      {changed && (
        <>
          <span className="text-ink-200">→</span>
          <span className="font-medium text-ink-900">
            Now showing {currentRows.toLocaleString()} of {originalRows.toLocaleString()} rows · {currentCols} of {originalCols} fields
          </span>
        </>
      )}
      <span className="ml-auto text-ink-600/40 hidden sm:inline">{raw.meta.fileName}</span>
    </div>
  );
}
