import React, { useState, useRef, useEffect } from 'react';
import { MicIcon, StopCircleIcon, PlusIcon, BeakerIcon, KeyboardIcon, ListIcon, SparklesIcon, TrashIcon } from './Icons';

interface ExamInputProps {
  examsInput: string;
  setExamsInput: (text: string) => void;
  onProcessExams: () => Promise<void>;
  isProcessing: boolean;
}

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const LAB_CATEGORIES = [
  {
    name: "Hematologia/Inflamação",
    items: ["Hemograma", "PCR", "VHS", "Ferritina"]
  },
  {
    name: "Bioquímica",
    items: ["Glicemia", "Colesterol Total", "Triglicerídeos", "Ureia", "Creatinina"]
  },
  {
    name: "Hormônios/Vitaminas",
    items: ["TSH", "T4 Livre", "Vitamina D", "Vitamina B12"]
  },
  {
    name: "Urina/Fezes",
    items: ["Urina 1", "Urocultura", "Parasitológico"]
  }
];

type InputTab = 'TYPE' | 'VOICE' | 'SUGGESTIONS';

const ExamInput: React.FC<ExamInputProps> = ({ examsInput, setExamsInput, onProcessExams, isProcessing }) => {
  const [activeTab, setActiveTab] = useState<InputTab>('TYPE');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'VOICE' && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [examsInput, activeTab]);

  useEffect(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const Recognition = SpeechRecognition || webkitSpeechRecognition;

    if (Recognition) {
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR'; 

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
           const cleanedText = finalTranscript.trim();
           if (cleanedText) {
             const formattedText = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
             setExamsInput((prev) => {
                 const separator = prev && !prev.endsWith('\n') ? '\n' : '';
                 return prev + separator + formattedText;
             });
           }
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [setExamsInput]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const addLabMacro = (text: string) => {
    setExamsInput(prev => prev + (prev && !prev.endsWith('\n') ? '\n' : '') + text + ": ");
  };

  const removeLastLine = () => {
      setExamsInput(prev => {
          const lines = prev.split('\n');
          if (lines.length > 0) {
              lines.pop();
              return lines.join('\n');
          }
          return prev;
      });
  };

  const parsedItems = examsInput.split('\n').filter(line => line.trim().length > 0);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-900 relative transition-colors">
      
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 flex justify-between items-center">
        <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
                <BeakerIcon className="w-4 h-4 text-emerald-600" />
                Entrada de Exames
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
                Informe os resultados brutos ou por voz.
            </p>
        </div>
        
        {/* Botão de Processamento Rápido */}
        <button
            onClick={onProcessExams}
            disabled={isProcessing || !examsInput.trim()}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm ${
                isProcessing || !examsInput.trim()
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
            }`}
        >
            <SparklesIcon className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? 'Processando...' : 'Inserir na Tabela'}
        </button>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
         <button 
           onClick={() => setActiveTab('TYPE')}
           className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'TYPE' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-slate-800' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
         >
            <KeyboardIcon className="w-4 h-4" /> Digitar
         </button>
         <button 
           onClick={() => setActiveTab('VOICE')}
           className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'VOICE' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-slate-800' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
         >
            <MicIcon className="w-4 h-4" /> Voz Inteligente
         </button>
         <button 
           onClick={() => setActiveTab('SUGGESTIONS')}
           className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'SUGGESTIONS' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-slate-800' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
         >
            <ListIcon className="w-4 h-4" /> Sugestões
         </button>
      </div>

      <div className="flex-grow min-h-0 relative bg-white dark:bg-slate-900 overflow-hidden">
        
        {activeTab === 'TYPE' && (
             <textarea
                ref={textareaRef}
                value={examsInput}
                onChange={(e) => setExamsInput(e.target.value)}
                placeholder="Exemplo: Hb 11.5, Leucócitos 12000, PCR 12..."
                className="w-full h-full resize-none border-0 focus:ring-0 p-6 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-7 text-sm font-mono bg-transparent transition-colors"
                autoFocus
              />
        )}

        {activeTab === 'VOICE' && (
            <div className="h-full flex flex-col relative">
                <div className="flex-grow overflow-y-auto p-4 space-y-2 pb-32">
                     {parsedItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 opacity-60 mt-10">
                            <SparklesIcon className="w-12 h-12 mb-2" />
                            <p className="text-sm">Fale os exames e a IA organizará.</p>
                            <p className="text-xs font-mono mt-1 italic">"Hemoglobina 10, leucócitos 15 mil"</p>
                        </div>
                     )}
                     
                     {parsedItems.map((item, idx) => (
                         <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                 {idx + 1}
                             </div>
                             <div className="font-mono text-sm text-slate-700 dark:text-slate-300 break-all">
                                 {item}
                             </div>
                         </div>
                     ))}
                     <div ref={listEndRef} />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900">
                    <div className="flex flex-col items-center justify-center">
                         <div className="relative mb-2">
                             {isListening && <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20"></div>}
                             <button
                                onClick={toggleListening}
                                className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg border-4 ${
                                    isListening 
                                    ? 'bg-red-500 border-red-200 text-white scale-110' 
                                    : 'bg-emerald-600 border-emerald-100 dark:border-emerald-900 text-white hover:scale-105'
                                }`}
                             >
                                {isListening ? <StopCircleIcon className="w-8 h-8" /> : <MicIcon className="w-8 h-8" />}
                             </button>
                         </div>
                         <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4">
                             {isListening ? "Ouvindo... (Pode falar natural)" : "Toque para Ditar"}
                         </p>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'SUGGESTIONS' && (
            <div className="h-full overflow-y-auto p-4 space-y-6">
                {LAB_CATEGORIES.map((category, idx) => (
                    <div key={idx}>
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">
                            {category.name}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {category.items.map((item) => (
                                <button
                                    key={item}
                                    onClick={() => addLabMacro(item)}
                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-emerald-200 text-slate-700 dark:text-slate-300 rounded text-xs font-medium transition-all"
                                >
                                    <PlusIcon className="w-3 h-3 text-emerald-500" />
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
};

export default ExamInput;