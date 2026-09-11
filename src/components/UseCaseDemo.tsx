import React, { useCallback } from 'react';

const NAMES = ['Aarav','Aisha','Bilal','Danish','Esha','Fiza','Gaurav','Hiba','Ishita','Javed'];
const DEPARTMENTS = ['Science','Commerce','Arts','Computer'];

const HEADERS = ['Student ID','Name','Score','Percentage','Admission Date','Active','Website','Fee','Department','Notes','Mixed','Created At'];

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Builds the same sample dataset used for the homepage practice flow.
 * It is intentionally exported as a File so the normal workspace upload /
 * parsing / analysis / workspace pipeline handles it exactly like a real upload.
 */
export function createInteractiveExampleFile(): File {
  const rows: unknown[][] = [HEADERS];
  for (let i = 0; i < 20; i += 1) {
    const month = String((i % 12) + 1).padStart(2, '0');
    const day = String((i % 27) + 1).padStart(2, '0');
    rows.push([
      `STU${String(2001 + i).padStart(4, '0')}`,
      `${NAMES[i % NAMES.length]} ${i + 1}`,
      62 + (i % 31),
      Number((61.5 + (i * 1.37) % 36).toFixed(2)),
      `2026-${month}-${day}`,
      i % 3 !== 0,
      `https://example.com/student/${i + 1}`,
      12500 + i * 275,
      DEPARTMENTS[i % DEPARTMENTS.length],
      i % 4 === 0 ? 'Needs review' : 'Good standing',
      i % 5 === 0 ? 'N/A' : i % 2 ? 'Verified' : 'Standard',
      `2026-${month}-${day}T10:30:00`
    ]);
  }

  const csv = rows.map(row => row.map(csvEscape).join(',')).join('\n');
  return new File([csv], 'DocBit Interactive Example.csv', { type: 'text/csv' });
}

interface Props {
  onTest: (file: File) => void;
}

/**
 * Homepage entry card only. The practice session itself is deliberately NOT
 * rendered here: Test opens the real HomePage analysis flow and then the same
 * production Workspace used for uploaded files.
 */
export function UseCaseDemo({ onTest }: Props) {
  const handleTest = useCallback(() => {
    onTest(createInteractiveExampleFile());
  }, [onTest]);

  return (
    <div className="relative mx-auto h-[390px] w-full max-w-5xl overflow-hidden rounded-2xl border border-ink-200 bg-paper-100 shadow-panel" aria-label="Interactive workspace example">
      <div className="absolute inset-0 p-4 sm:p-7">
        <div className="h-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm blur-[2.5px] opacity-80">
          <div className="flex h-12 items-center gap-3 border-b border-ink-100 px-4">
            <div className="h-5 w-20 rounded bg-ink-100" />
            <div className="h-8 w-48 rounded-lg bg-paper-100" />
            <div className="ml-auto h-8 w-24 rounded-lg bg-paper-100" />
          </div>
          <div className="flex h-[calc(100%-3rem)]">
            <div className="hidden w-44 border-r border-ink-100 p-3 sm:block">
              <div className="h-7 rounded bg-blue-50" />
              <div className="mt-2 h-7 rounded bg-paper-100" />
              <div className="mt-2 h-7 rounded bg-paper-100" />
              <div className="mt-2 h-7 rounded bg-paper-100" />
            </div>
            <div className="min-w-0 flex-1 p-3">
              <div className="grid grid-cols-6 gap-px overflow-hidden rounded-lg border border-ink-100 bg-ink-100">
                {Array.from({ length: 48 }).map((_, i) => <div key={i} className={`h-9 bg-white ${i < 6 ? 'bg-blue-50' : ''}`} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/20 p-5">
        <div className="max-w-md rounded-2xl border border-white/80 bg-white/95 p-6 text-center shadow-xl backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Interactive workspace</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-ink-900">Test the real DocBit workspace</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-600/65">Test DocBit with a safe 20-row sample. It will run through the same upload, analysis, configuration, editing, import, export, and responsive workspace flow as a real file.</p>
          <button type="button" onClick={handleTest} className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[.99]">Test workspace</button>
        </div>
      </div>
    </div>
  );
}
