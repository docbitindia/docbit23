import React from 'react';
import type { ProcessedReport } from '../types/processed';
import type { ReportConfig } from '../types/report';

interface Props {
  report: ProcessedReport;
  config: ReportConfig;
}

export function StatusBar({ report, config }: Props) {
  const primarySort = config.sorts[0];
  const primarySortCol = primarySort ? report.columns.find((c) => c.key === primarySort.columnKey) : null;

  const parts: string[] = [
    `${report.stats.finalRowCount.toLocaleString()} row${report.stats.finalRowCount === 1 ? '' : 's'}`,
    `${report.stats.selectedColumnCount} column${report.stats.selectedColumnCount === 1 ? '' : 's'}`
  ];
  if (report.stats.activeFilterCount > 0) {
    parts.push(`${report.stats.activeFilterCount} filter${report.stats.activeFilterCount === 1 ? '' : 's'}`);
  }
  if (primarySortCol) {
    parts.push(`Sorted by ${primarySortCol.displayName} ${primarySort!.direction === 'asc' ? '↑' : '↓'}`);
  }
  if (report.stats.isGrouped) {
    parts.push(`Grouped · ${report.groups?.length ?? 0} groups`);
  }

  return (
    <div className="flex items-center gap-x-2 gap-y-1 flex-wrap px-3.5 sm:px-5 py-1.5 text-[11px] text-ink-600/70 border-b border-ink-200 bg-paper-100/60 font-mono">
      {parts.map((p, i) => (
        <React.Fragment key={p}>
          {i > 0 && <span className="text-ink-200">·</span>}
          <span>{p}</span>
        </React.Fragment>
      ))}
    </div>
  );
}
