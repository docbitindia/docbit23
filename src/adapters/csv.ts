import Papa from 'papaparse';
import type { RawDataset } from '../types/dataset';
import { makeId } from '../utils/id';
import { normalizeRows } from './normalize';
import { AdapterError } from './errors';

export async function parseCsvFile(file: File): Promise<RawDataset> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new AdapterError("We couldn't read this file from disk. Please try again.");
  }

  if (text.trim().length === 0) {
    throw new AdapterError('This file is empty.');
  }

  const result = Papa.parse<string[]>(text, {
    header: false,
    dynamicTyping: true,
    skipEmptyLines: false,
    delimiter: ''
  });

  if (result.errors && result.errors.length > 0) {
    const fatal = result.errors.filter((e) => e.type === 'Delimiter' || e.type === 'Quotes');
    if (fatal.length > 0 && result.data.length === 0) {
      throw new AdapterError('This CSV file appears to be malformed and could not be read.');
    }
  }

  const data = (result.data as unknown[][]).filter((row) => Array.isArray(row));
  const { rows, columnCount } = normalizeRows(data);

  if (rows.length === 0) {
    throw new AdapterError('This CSV file does not contain any rows of data.');
  }

  return {
    id: makeId('ds'),
    meta: {
      fileName: file.name,
      fileType: 'csv',
      fileSize: file.size,
      importedAt: new Date().toISOString()
    },
    rows,
    columnCount,
    columnIds: Array.from({ length: columnCount }, (_, i) => `col_${i}`)
  };
}
