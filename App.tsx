import React, { useState, useRef, useEffect } from 'react';
import { generateClinicalNote, parseLabExams } from './services/geminiService';
import { AnalysisResult, AppState, PatientInfo, ConsultationType } from './types';
import { INITIAL_PATIENT_INFO, MOCK_TRANSCRIPT_SOAP, MOCK_TRANSCRIPT_PEDIATRIC, MOCK_TRANSCRIPT_NEURO } from './constants';
import TranscriptInput from './components/TranscriptInput';
import ExamInput from './components/ExamInput';
import PatientForm from './components/PatientForm';
import ResultDisplay from './components/ResultDisplay';
import ToolsPanel from './components/ToolsPanel';
import { StethoscopeIcon, FileTextIcon, MicroscopeIcon, SparklesIcon, GripVerticalIcon, SunIcon, MoonIcon, WandIcon, PlusIcon } from './components/Icons';

type InputTab = 'TRANSCRIPT' | 'EXAMS' | 'TOOLS';

const App: React.FC = () => {
  const [patientInfo, setPatientInfo] = useState<PatientInfo>(INITIAL_PATIENT_INFO);
  const [transcript, setTranscript] = useState<string>('');
  const [examsInput, setExamsInput] = useState<string>('');
  const [consultationType, setConsultationType] = useState<ConsultationType>('SOAP');
  const [activeInputTab, setActiveInputTab] = useState<InputTab>('TRANSCRIPT');
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [isParsingExams, setIsParsingExams] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [leftWidth, setLeftWidth] = useState<number>(45); 
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (newLeftWidth > 20 && newLeftWidth < 80) setLeftWidth(newLeftWidth);
    };
    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = 'default';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const handleParseExams = async () => {
    if (!examsInput.trim()) return;
    setIsParsingExams(true);
    try {
      const parsedLabs = await parseLabExams(examsInput, patientInfo.age);
      
      if (result) {
        setResult({ ...result, labResults: [...result.labResults, ...parsedLabs] });
      } else {
        setResult({
          clinicalNote: "# Nota em construção\nOs exames foram processados. Clique em 'Gerar' para a nota completa.\n\n{{TABELA_EXAMES}}",
          labResults: parsedLabs,
          icd10: [],
          patientInstructions: "Instruções serão geradas com a nota completa."
        });
      }
      setExamsInput('');
    } catch (err: any) {
      setError("Falha ao processar exames: " + err.message);
    } finally {
      setIsParsingExams(false);
    }
  };

  const handleSubmit = async () => {
    if (!transcript.trim() && !examsInput.trim() && (!result || result.labResults.length === 0)) return;
    setAppState(AppState.PROCESSING);
    setError(null);
    try {
      const data = await generateClinicalNote(transcript, examsInput, patientInfo, consultationType);
      if (result && result.labResults.length > 0) {
          data.labResults = [...result.labResults, ...data.labResults];
      }
      setResult(data);
      setAppState(AppState.COMPLETED);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar nota.');
      setAppState(AppState.ERROR);
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Novo atendimento?")) {
      setTranscript('');
      setExamsInput('');
      setPatientInfo({ ...INITIAL_PATIENT_INFO, visitDate: new Date().toISOString().split('T')[0] });
      setResult(null);
      setAppState(AppState.IDLE);
      setActiveInputTab('TRANSCRIPT');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-rose-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-200">
      <header className="bg-white dark:bg-slate-900 border-b border-rose-300 dark:border-slate-800 shrink-0 z-30 shadow-sm py-1 px-4 flex items-center justify-between h-12">
        <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-pink-600 to-rose-600 p-1 rounded shadow-md">
               <StethoscopeIcon className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-none">PediaNote</h1>
        </div>
        
        <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="bg-rose-50/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-lg border border-rose-100 dark:border-slate-700 hidden lg:block">
                <PatientForm patientInfo={patientInfo} setPatientInfo={setPatientInfo} />
            </div>

            <div className="flex bg-rose-100 dark:bg-slate-800 p-0.5 rounded-lg border border-rose-200 dark:border-slate-700">
               <button onClick={() => setActiveInputTab('TRANSCRIPT')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${activeInputTab === 'TRANSCRIPT' ? 'bg-white dark:bg-slate-700 text-pink-700' : 'text-rose-600 dark:text-slate-400'}`}>
                 <FileTextIcon className="w-3 h-3" /> Transcrição
               </button>
               <button onClick={() => setActiveInputTab('EXAMS')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${activeInputTab === 'EXAMS' ? 'bg-white dark:bg-slate-700 text-emerald-700' : 'text-emerald-600 dark:text-slate-400'}`}>
                 <MicroscopeIcon className="w-3 h-3" /> Lab
               </button>
               <button onClick={() => setActiveInputTab('TOOLS')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${activeInputTab === 'TOOLS' ? 'bg-white dark:bg-slate-700 text-purple-700' : 'text-purple-600 dark:text-slate-400'}`}>
                 <WandIcon className="w-3 h-3" /> IA
               </button>
            </div>

            <select value={consultationType} onChange={(e) => setConsultationType(e.target.value as ConsultationType)} className="text-xs font-bold border-rose-300 dark:border-slate-600 rounded py-1 pl-2 pr-6 dark:bg-slate-800 h-8">
             <option value="SOAP">SOAP</option>
             <option value="PEDIATRIC">Pediátrica</option>
             <option value="NEURO">Neuro</option>
           </select>
           
           <button onClick={handleSubmit} disabled={appState === AppState.PROCESSING} className="py-1.5 px-4 rounded-md flex items-center justify-center gap-2 font-bold text-white bg-pink-600 hover:bg-pink-700 h-8 text-xs uppercase disabled:opacity-50">
              <SparklesIcon className={`w-3 h-3 ${appState === AppState.PROCESSING ? 'animate-spin' : ''}`} />
              {appState === AppState.PROCESSING ? 'Gerando...' : 'Gerar Nota'}
            </button>

            <button onClick={handleClearAll} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-rose-50 dark:bg-rose-900/20 text-rose-700 border border-rose-200 h-8 text-xs font-bold">
              <PlusIcon className="w-3 h-3" /> Novo
            </button>

            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>
        </div>
      </header>

      <main className="flex-grow min-h-0 w-full relative">
        <div ref={containerRef} className="flex h-full w-full">
            <div style={{ width: `${leftWidth}%` }} className="h-full min-w-[200px] flex flex-col bg-white dark:bg-slate-900 border-r border-rose-200 dark:border-slate-800 transition-all duration-75">
                <div className="flex-grow relative overflow-hidden">
                    <div className={`absolute inset-0 transition-opacity duration-200 ${activeInputTab === 'TRANSCRIPT' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                        <TranscriptInput transcript={transcript} setTranscript={setTranscript} consultationType={consultationType} setConsultationType={setConsultationType} onSubmit={handleSubmit} isProcessing={appState === AppState.PROCESSING} />
                    </div>
                    <div className={`absolute inset-0 transition-opacity duration-200 ${activeInputTab === 'EXAMS' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                        <ExamInput examsInput={examsInput} setExamsInput={setExamsInput} onProcessExams={handleParseExams} isProcessing={isParsingExams} />
                    </div>
                    <div className={`absolute inset-0 transition-opacity duration-200 ${activeInputTab === 'TOOLS' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                        <ToolsPanel />
                    </div>
                </div>
            </div>
            <div onMouseDown={handleMouseDown} className="w-3 bg-rose-50 dark:bg-slate-800 hover:bg-rose-200 cursor-col-resize flex items-center justify-center border-l border-r border-rose-200 dark:border-slate-700 z-20 transition-colors">
                <GripVerticalIcon className="w-4 h-4 text-rose-300" />
            </div>
            <div className="flex-1 h-full min-w-[300px] bg-white dark:bg-slate-900 overflow-hidden">
                <ResultDisplay result={result} onResultUpdate={setResult} isProcessing={appState === AppState.PROCESSING} />
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;