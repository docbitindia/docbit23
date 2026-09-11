import type { DocumentState } from '../types/document';
import type { Project, ProjectFile } from '../types/cloud';

let pendingFile: File | null = null;
let editingDocument: DocumentState | null = null;
let editingBaseline: DocumentState | null = null;
let editingFile: File | null = null;
let editingCloud: { project: Project; file: ProjectFile } | null = null;

export function setPendingFile(file: File) { pendingFile = file; }
export function takePendingFile(): File | null { const file = pendingFile; pendingFile = null; return file; }
export function setEditingSession(document: DocumentState, baseline: DocumentState | null, file: File | null, cloud: { project: Project; file: ProjectFile } | null = null) {
  editingDocument = document; editingBaseline = baseline; editingFile = file; editingCloud = cloud;
}
export function getEditingSession() {
  if (!editingDocument) return null;
  return { document: editingDocument, baseline: editingBaseline, file: editingFile, cloud: editingCloud };
}
export function clearEditingSession() { editingDocument = null; editingBaseline = null; editingFile = null; editingCloud = null; }
