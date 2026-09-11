import React, { useEffect, useState } from 'react';
import { parseFile, AdapterError } from '../adapters';
import { guessHeaderRow, buildSchema } from '../engine/headerDetection';
import { createDefaultConfig } from '../engine/config';
import { AnalysisSequence } from '../components/AnalysisSequence';
import { DatasetSummary } from '../components/DatasetSummary';
import { useToast } from '../hooks/useToast';
import { usePageMeta } from '../hooks/usePageMeta';
import { PAGE_META } from '../seo/pageMeta';
import { navigate } from '../router/useRoute';
import { useHistory } from '../hooks/useReportHistory';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import type { DocumentState } from '../types/document';
import { setEditingSession, takePendingFile, clearEditingSession } from '../state/editorSession';
import { useAuth } from '../context/AuthContext';
import { addActivity, incrementProcessedUsage } from '../services/cloud';
import { getPlan } from '../data/plans';

const EMPTY: DocumentState = {
  raw: { id: 'empty', meta: { fileName: '', fileType: 'csv', fileSize: 0, importedAt: '' }, rows: [], columnCount: 0 },
  config: { revision: 0, headerRowIndex: 0, excludedRanges: [], columns: [], filterGroup: { id: 'fg', logic: 'AND', conditions: [] }, sorts: [], group: { columnKey: null, aggregates: [] }, calculations: [], design: { fileName: 'extracted_data', showSummary: true, density: 'comfortable' } }
};

export function AnalyzePage() {
  usePageMeta(PAGE_META['/analyzing']);
  const toast = useToast();
  const session = useHistory<DocumentState>(EMPTY);
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState<'loading' | 'summary' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<ReturnType<typeof buildSchema> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [started, setStarted] = useState(false);
  const { session: authSession, user } = useAuth();
  const plan = getPlan(user?.plan);

  useEffect(() => {
    if (started) return;
    setStarted(true);
    clearEditingSession();
    const pending = takePendingFile();
    if (!pending) {
      navigate('/');
      return;
    }
    setFile(pending);
    setFileName(pending.name);
    const run = async () => {
      const tick = (n: number) => new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(() => { setStep(n); resolve(); }, 100)));
      try {
        await tick(0);
        const dataset = await parseFile(pending);
        if (authSession) await incrementProcessedUsage(authSession);
        await tick(1);
        const headerRowIndex = guessHeaderRow(dataset.rows);
        await tick(2);
        const builtSchema = buildSchema(dataset, headerRowIndex);
        await tick(3);
        await tick(4);
        await tick(5);
        const config = createDefaultConfig(builtSchema, dataset.meta.fileName);
        session.replaceAll({ raw: dataset, config });
        setSchema(builtSchema);
        if (authSession) void addActivity(authSession, { type: 'file_analyzed', label: `Analyzed “${pending.name}”` }).catch(() => undefined);
        setStage('summary');
      } catch (err) {
        const message = err instanceof AdapterError ? err.message : "We couldn't read this file. It may be corrupted or unsupported.";
        setError(message);
        setStage('error');
        toast.push(message, 'error');
      }
    };
    void run();
  }, [started, session.replaceAll, toast, authSession, plan]);

  const continueToEditing = () => {
    if (!schema || !file) return;
    setEditingSession(session.state, session.state, file);
    const base = file.name.replace(/\.[^.]+$/, '').trim() || 'untitled';
    navigate(`/editing/${encodeURIComponent(base)}`);
  };

  if (stage === 'error') {
    return <div className="min-h-screen bg-paper-50"><div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-5"><div className="w-full rounded-2xl border border-rose-200 bg-white p-6 shadow-panel"><h1 className="text-lg font-semibold text-ink-900">Unable to analyze file</h1><p className="mt-2 text-sm text-ink-600/70">{error}</p><button type="button" onClick={() => navigate('/')} className="mt-5 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white">Start over</button></div></div></div>;
  }

  return <div className="min-h-screen bg-paper-50">
    <header className="flex items-center justify-between border-b border-[#e1e4df] bg-white px-3 py-2.5 sm:px-5">
      <button type="button" onClick={() => navigate('/')} className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-700 hover:bg-white"><ArrowLeft size={16}/> Back</button>
      <button type="button" onClick={() => navigate('/')} className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-700 hover:bg-white"><RotateCcw size={15}/> Replace</button>
    </header>
    <main className="px-5 py-14 sm:px-8 sm:py-20">
    {stage === 'loading' && <div className="flex justify-center"><AnalysisSequence fileName={fileName} activeIndex={step} /></div>}
    {stage === 'summary' && schema && <div className="flex justify-center"><DatasetSummary raw={session.state.raw} schema={schema} onContinue={continueToEditing} /></div>}
  </main></div>;
}
