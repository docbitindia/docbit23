import * as XLSX from 'xlsx';
import type { CellValue, RawDataset } from '../types/dataset';
import { makeId } from '../utils/id';
import { normalizeRows } from './normalize';
import { AdapterError } from './errors';

export async function parseExcelFile(file: File, preferredSheet?: string): Promise<RawDataset> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new AdapterError("We couldn't read this file from disk. Please try again.");
  }

  if (buffer.byteLength === 0) {
    throw new AdapterError('This file is empty.');
  }

  let workbook: XLSX.WorkBook;
  try {
    // cellDates converts Excel date serials to JS Date objects so normalizeRows
    // can turn them into stable ISO strings regardless of the workbook's
    // original number format. cellNF/cellText are left off intentionally —
    // we want raw values, not locale-formatted display strings.
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: true });
  } catch {
    throw new AdapterError('This Excel file could not be opened. It may be corrupted or in an unsupported format.');
  }

  const sheetNames = workbook.SheetNames.filter((name) => {
    const sheet = workbook.Sheets[name];
    return sheet && sheet['!ref'];
  });

  if (sheetNames.length === 0) {
    throw new AdapterError('No readable sheets were found in this workbook.');
  }

  const sheetName =
    preferredSheet && sheetNames.includes(preferredSheet) ? preferredSheet : pickBestSheet(workbook, sheetNames);

  const { rows, columnCount } = readSheet(workbook, sheetName);

  if (rows.length === 0) {
    throw new AdapterError('This spreadsheet does not contain any rows of data.');
  }

  return {
    id: makeId('ds'),
    meta: {
      fileName: file.name,
      fileType: file.name.toLowerCase().endsWith('.xls') ? 'xls' : 'xlsx',
      fileSize: file.size,
      sheetName,
      sheetNames,
      importedAt: new Date().toISOString()
    },
    rows,
    columnCount,
    columnIds: Array.from({ length: columnCount }, (_, i) => `col_${i}`)
  };
}

/**
 * Reads a single sheet into a rectangular grid. Merged cells (common in
 * report-style workbooks with a title or grouped header spanning several
 * columns) are unmerged by filling every covered cell with the top-left
 * value, so header detection and column counting don't see phantom blanks.
 */
function readSheet(workbook: XLSX.WorkBook, sheetName: string): { rows: CellValue[][]; columnCount: number } {
  const sheet = workbook.Sheets[sheetName];

  let aoa: unknown[][];
  try {
    aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: true }) as unknown[][];
  } catch {
    throw new AdapterError('We could not extract data from this spreadsheet.');
  }

  const merges = sheet['!merges'] ?? [];
  if (merges.length > 0) {
    for (const range of merges) {
      const topLeft = aoa[range.s.r]?.[range.s.c] ?? null;
      for (let r = range.s.r; r <= range.e.r; r++) {
        if (!aoa[r]) aoa[r] = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          if (r === range.s.r && c === range.s.c) continue;
          if (aoa[r][c] === null || aoa[r][c] === undefined || aoa[r][c] === '') {
            aoa[r][c] = topLeft;
          }
        }
      }
    }
  }

  return normalizeRows(aoa as CellValue[][]);
}

/**
 * Real workbooks frequently ship a cover/instructions sheet first (or a
 * pivot/summary tab) with the actual tabular data on a later sheet.
 * Blindly using SheetNames[0] silently analyzes the wrong sheet, so we
 * score every sheet by how much real tabular data it holds and pick the
 * strongest candidate. A cheap !ref-based pass first rules out sheets that
 * are obviously tiny, so we only fully parse serious candidates.
 */
function pickBestSheet(workbook: XLSX.WorkBook, sheetNames: string[]): string {
  if (sheetNames.length === 1) return sheetNames[0];

  const roughSizes = sheetNames.map((name) => {
    const ref = workbook.Sheets[name]['!ref'];
    if (!ref) return { name, cells: 0 };
    const range = XLSX.utils.decode_range(ref);
    const cells = (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);
    return { name, cells };
  });

  const candidates = roughSizes
    .filter((s) => s.cells > 0)
    .sort((a, b) => b.cells - a.cells)
    .slice(0, 8) // don't fully parse dozens of sheets on huge workbooks
    .map((s) => s.name);

  let best = sheetNames[0];
  let bestScore = -1;

  for (const name of candidates) {
    try {
      const { rows } = readSheet(workbook, name);
      const dataLikeRows = rows.filter(
        (r) => r.filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length >= 2
      ).length;
      const nonEmptyCells = rows.reduce(
        (sum, r) => sum + r.filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length,
        0
      );
      const score = dataLikeRows * 100 + nonEmptyCells;
      if (score > bestScore) {
        bestScore = score;
        best = name;
      }
    } catch {
      // Skip sheets that fail to parse individually rather than failing the whole import.
    }
  }

  return best;
}
