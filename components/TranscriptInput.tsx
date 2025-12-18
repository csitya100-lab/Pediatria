import React, { useState, useRef, useEffect, Dispatch, SetStateAction } from 'react';
import { MicIcon, StopCircleIcon, TrashIcon, FileTextIcon } from './Icons';
import { ConsultationType } from '../types';

interface TranscriptInputProps {
  transcript: string;
  setTranscript: Dispatch<SetStateAction<string>>;
  consultationType: ConsultationType;
  setConsultationType: (type: ConsultationType) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  onLoadExample?: () => void;
}

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const TranscriptInput: React.FC<TranscriptInputProps> = ({ 
  transcript, 
  setTranscript, 
  consultationType,
  onLoadExample
}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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
           setTranscript((prev) => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [setTranscript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (transcript.length > 0) {
        if(window.confirm("Iniciar uma nova gravação limpará o texto atual. Continuar?")) {
           setTranscript('');
           recognitionRef.current?.start();
           setIsListening(true);
        }
      } else {
        setTranscript('');
        recognitionRef.current?.start();
        setIsListening(true);
      }
    }
  };

  const handleClearTranscript = () => {
    // Removing confirmation for local clear button to improve UX and fix reported issues
    if (transcript.length > 0) {
        setTranscript('');
    }
  };

  return (
    <div className="flex flex-col relative h-full w-full bg-white dark:bg-slate-900 group transition-colors">
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={`Área de transcrição ou digitação livre.\n\nDicas:\n- Dite a história do paciente\n- Descreva o exame físico\n- A IA separará tudo automaticamente.`}
          className="flex-grow w-full resize-none border-0 focus:ring-0 p-6 text-slate-800 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-500 leading-relaxed text-base bg-white dark:bg-slate-900 transition-colors"
        />
        
        {/* Helper Buttons (Bottom Left) */}
        <div className="absolute bottom-6 left-6 flex gap-2 z-20">
             <button
               onClick={handleClearTranscript}
               disabled={!transcript}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${
                   !transcript 
                   ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700 cursor-not-allowed' 
                   : 'bg-white text-slate-600 border-slate-200 hover:text-red-600 hover:bg-red-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700'
               }`}
               title="Limpar Transcrição"
             >
                 <TrashIcon className="w-3 h-3" />
                 Limpar
             </button>
             
             {onLoadExample && (
                 <button
                   onClick={onLoadExample}
                   className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border bg-white text-slate-600 border-slate-200 hover:text-pink-600 hover:bg-pink-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700"
                   title="Carregar Texto de Exemplo"
                 >
                     <FileTextIcon className="w-3 h-3" />
                     Exemplo
                 </button>
             )}
        </div>

        {/* Floating Mic Button (Bottom Right) */}
        <div className="absolute bottom-6 right-6 flex gap-2 z-20">
           {recognitionRef.current && (
            <button
              onClick={toggleListening}
              className={`p-4 rounded-full shadow-xl transition-all duration-200 flex items-center justify-center border-2 ${
                isListening 
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse border-red-200 ring-4 ring-red-100' 
                  : 'bg-pink-600 hover:bg-pink-700 text-white border-white dark:border-slate-700 hover:scale-110 shadow-pink-900/20'
              }`}
              title={isListening ? "Parar Gravação" : "Iniciar Nova Gravação"}
            >
              {isListening ? <StopCircleIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
            </button>
          )}
        </div>
    </div>
  );
};

export default TranscriptInput;