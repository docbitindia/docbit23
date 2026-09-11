import type { CellValue, RawDataset } from '../types/dataset';
import { makeId } from '../utils/id';
import { normalizeRows } from './normalize';
import { AdapterError } from './errors';

export async function parseJsonFile(file: File): Promise<RawDataset> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new AdapterError("We couldn't read this file from disk. Please try again.");
  }

  if (text.trim().length === 0) {
    throw new AdapterError('This file is empty.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AdapterError('This JSON file is not valid. Please check the file structure and try again.');
  }

  let records: unknown[];
  if (Array.isArray(parsed)) {
    records = parsed;
  } else if (parsed && typeof parsed === 'object') {
    // Look for the first array property (common API-response shape), otherwise wrap the object.
    const values = Object.values(parsed as Record<string, unknown>);
    const arrayProp = values.find((v) => Array.isArray(v));
    records = Array.isArray(arrayProp) ? (arrayProp as unknown[]) : [parsed];
  } else {
    throw new AdapterError('This JSON file does not contain a list of records that can be turned into a report.');
  }

  if (records.length === 0) {
    throw new AdapterError('This JSON file does not contain any records.');
  }

  const aoa = jsonRecordsToRows(records);
  const { rows, columnCount } = normalizeRows(aoa);

  if (rows.length === 0) {
    throw new AdapterError('This JSON file does not contain any usable records.');
  }

  return {
    id: makeId('ds'),
    meta: {
      fileName: file.name,
      fileType: 'json',
      fileSize: file.size,
      importedAt: new Date().toISOString()
    },
    rows,
    columnCount,
    columnIds: Array.from({ length: columnCount }, (_, i) => `col_${i}`)
  };
}

function jsonRecordsToRows(records: unknown[]): CellValue[][] {
  const isObjectArray = records.every((r) => r && typeof r === 'object' && !Array.isArray(r));

  if (isObjectArray) {
    // Union of keys, preserving first-seen order, so every record maps to a stable column set.
    const keys: string[] = [];
    const keySet = new Set<string>();
    for (const rec of records) {
      for (const key of Object.keys(rec as Record<string, unknown>)) {
        if (!keySet.has(key)) {
          keySet.add(key);
          keys.push(key);
        }
      }
    }
    const headerRow: CellValue[] = keys;
    const dataRows: CellValue[][] = records.map((rec) =>
      keys.map((k) => flattenValue((rec as Record<string, unknown>)[k]))
    );
    return [headerRow, ...dataRows];
  }

  // Array of arrays: treat the first row as the header if it looks like labels,
  // otherwise generate generic column headers.
  if (records.every((r) => Array.isArray(r))) {
    return records as CellValue[][];
  }

  // Array of primitives: single "Value" column.
  const headerRow: CellValue[] = ['Value'];
  const dataRows: CellValue[][] = records.map((r) => [flattenValue(r)]);
  return [headerRow, ...dataRows];
}

function flattenValue(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
