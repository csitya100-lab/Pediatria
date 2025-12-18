import React, { useState } from 'react';
import { AnalysisResult, LabItem } from '../types';
import { generateSpeech } from '../services/geminiService';
import { ClipboardIcon, CheckIcon, ActivityIcon, HeartIcon, FileTextIcon, PrinterIcon, FileWordIcon, SparklesIcon, Volume2Icon, TableIcon, Trash2Icon, PlusIcon, DownloadIcon } from './Icons';

interface ResultDisplayProps {
  result: AnalysisResult | null;
  onResultUpdate: (newResult: AnalysisResult) => void;
  isProcessing?: boolean;
}

type Tab = 'NOTE' | 'LABS' | 'ICD' | 'INSTRUCTIONS';
type ExportFormat = 'WORD' | 'PDF' | 'PRINT'; 
type ExportSection = 'FULL' | 'NOTE' | 'LABS' | 'ICD' | 'INSTRUCTIONS';

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, onResultUpdate, isProcessing = false }) => {
  const [activeTab, setActiveTab] = useState<Tab>('NOTE');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // States for Manual ICD Entry
  const [newIcdCode, setNewIcdCode] = useState('');
  const [newIcdDesc, setNewIcdDesc] = useState('');

  const LoadingOverlay = () => (
    <div className="absolute inset-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 border-4 border-rose-100 dark:border-slate-800 rounded-full"></div>
        <div className="absolute inset-0 border-t-4 border-pink-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
           <SparklesIcon className="w-6 h-6 text-pink-600 animate-pulse" />
        </div>
      </div>
      <p className="text-lg font-bold text-slate-800 dark:text-slate-200 animate-pulse">
        Gerando documentação clínica...
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-xs">
        Analisando transcrição e exames com Gemini AI
      </p>
    </div>
  );

  // Case 1: Initial Processing (No result yet)
  if (!result && isProcessing) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 transition-colors p-12 relative">
        <LoadingOverlay />
      </div>
    );
  }

  // Case 2: Empty State (No result, not processing)
  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 transition-colors p-12 text-rose-500 dark:text-slate-400">
        <ActivityIcon className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-xl font-bold text-rose-700 dark:text-slate-300">Pronto para analisar</p>
        <p className="text-base text-slate-700 dark:text-slate-400 mt-2 text-center max-w-sm">Preencha os dados do paciente, escolha o tipo de consulta e insira a transcrição.</p>
      </div>
    );
  }

  // Safely access labResults
  const labs = result.labResults || [];

  // --- CONTENT GENERATION HELPERS ---

  const generateMarkdownTable = (items: LabItem[]) => {
    if (!items || items.length === 0) return "*Nenhum exame registrado.*";
    
    const header = "| Exame | Resultado | Unidade | Ref. Pediátrica | Status |\n|---|---|---|---|---|";
    const rows = items.map(item => 
      `| ${item.name} | ${item.result} | ${item.unit} | ${item.reference} | ${item.status} |`
    ).join("\n");
    
    return `${header}\n${rows}`;
  };

  const getFullMarkdown = () => {
    const tableMd = generateMarkdownTable(labs);
    if (result.clinicalNote.includes('{{TABELA_EXAMES}}')) {
        return result.clinicalNote.replace('{{TABELA_EXAMES}}', tableMd);
    } else {
        return result.clinicalNote; 
    }
  };

  const parseMarkdown = (text: string) => {
      let html = text;

      // 1. Tables (Basic Support)
      const tableRowRegex = /^\|(.+)\|$/gm;
      
      if (html.match(tableRowRegex)) {
        html = html.replace(/^\|[-:| ]+\|$/gm, ''); 
        
        html = html.replace(/^\|(.+)\|$/gm, (match, content) => {
            const cells = content.split('|').map((c: string) => c.trim());
            const cellHtml = cells.map((c: string) => `<td style="border: 1px solid #ddd; padding: 8px;">${c}</td>`).join('');
            return `<tr>${cellHtml}</tr>`;
        });
        
        html = html.replace(/(<tr>.*?<\/tr>\n?)+/g, (match) => {
            return `<table style="border-collapse: collapse; width: 100%; margin-bottom: 16px; font-size: 12px;">${match}</table>`;
        });
      }

      // 2. Standard Markdown
      html = html
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/^- (.*$)/gim, '<li>$1</li>')
          .replace(/\n/g, '<br>');

      return html;
  };

  // --- GENERIC EXPORT HANDLER ---

  const handleExport = (format: ExportFormat, section: ExportSection) => {
    let title = "Documento";
    let bodyContent = "";

    // 1. Build Content based on Section
    switch (section) {
        case 'FULL':
            title = "Prontuário Completo";
            bodyContent += `<h1>Nota Clínica</h1>`;
            bodyContent += parseMarkdown(getFullMarkdown());
            bodyContent += `<h1>Códigos CID-10</h1><ul>`;
            result.icd10.forEach(code => {
                bodyContent += `<li><strong>${code.code}</strong>: ${code.description}</li>`;
            });
            bodyContent += `</ul>`;
            bodyContent += `<h1>Instruções para o Paciente</h1>`;
            bodyContent += parseMarkdown(result.patientInstructions);
            break;

        case 'NOTE':
            title = "Nota Clínica";
            bodyContent += `<h1>Nota Clínica</h1>`;
            bodyContent += parseMarkdown(getFullMarkdown());
            break;

        case 'LABS':
            title = "Resultados de Exames";
            bodyContent += `<h1>Exames Laboratoriais</h1>`;
            bodyContent += parseMarkdown(generateMarkdownTable(labs));
            break;

        case 'ICD':
            title = "Relatório de Codificação (CID-10)";
            bodyContent += `<h1>Códigos CID-10</h1><ul>`;
            result.icd10.forEach(code => {
                bodyContent += `<li><strong>${code.code}</strong>: ${code.description}</li>`;
            });
            bodyContent += `</ul>`;
            break;

        case 'INSTRUCTIONS':
            title = "Instruções ao Paciente";
            bodyContent += `<h1>Instruções de Cuidado</h1>`;
            bodyContent += parseMarkdown(result.patientInstructions);
            break;
    }

    // 2. Wrap HTML
    const fullHTML = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>${title}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
                h1 { color: #be185d; font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #fbcfe8; padding-bottom: 10px; margin-top: 30px; }
                h2 { color: #db2777; font-size: 20px; margin-top: 20px; margin-bottom: 10px; }
                li { margin-bottom: 5px; }
                strong { color: #000; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                @media print {
                    @page { margin: 2cm; }
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            ${bodyContent}
        </body>
        </html>
    `;

    // 3. Execute Export
    if (format === 'WORD') {
        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(fullHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `${title.toLowerCase().replace(/ /g, '_')}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    } else if (format === 'PDF' || format === 'PRINT') {
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write(fullHTML);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    }
  };

  // --- INTERACTIVE ACTIONS ---

  const handleCopy = (text: string, section: string) => {
    const contentToCopy = section === 'note' ? getFullMarkdown() : text;
    navigator.clipboard.writeText(contentToCopy);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleNoteChange = (value: string) => {
    onResultUpdate({ ...result, clinicalNote: value });
  };

  const handleLabChange = (index: number, field: keyof LabItem, value: string) => {
    const newLabs = [...labs];
    newLabs[index] = { ...newLabs[index], [field]: value };
    onResultUpdate({ ...result, labResults: newLabs });
  };

  const deleteLabItem = (index: number) => {
    const newLabs = labs.filter((_, i) => i !== index);
    onResultUpdate({ ...result, labResults: newLabs });
  };

  const addLabItem = () => {
    const newItem: LabItem = { name: '', result: '', unit: '', reference: '', status: '' };
    onResultUpdate({ ...result, labResults: [...labs, newItem] });
  };

  const handleInstructionsChange = (value: string) => {
    onResultUpdate({ ...result, patientInstructions: value });
  };

  const handleAddIcd = () => {
    if (!newIcdCode.trim() || !newIcdDesc.trim()) return;
    const newItem = { code: newIcdCode.trim().toUpperCase(), description: newIcdDesc.trim() };
    onResultUpdate({ ...result, icd10: [...result.icd10, newItem] });
    setNewIcdCode('');
    setNewIcdDesc('');
  };

  const handleRemoveIcd = (index: number) => {
    const newIcdList = result.icd10.filter((_, i) => i !== index);
    onResultUpdate({ ...result, icd10: newIcdList });
  };

  const handleTTS = async (text: string) => {
    if (isPlayingAudio) return;
    try {
        setIsPlayingAudio(true);
        const spokenText = text.replace('{{TABELA_EXAMES}}', 'Tabela de exames disponíveis no prontuário.');
        const arrayBuffer = await generateSpeech(spokenText.substring(0, 1500)); 
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setIsPlayingAudio(false);
        source.start();
    } catch (e) {
        console.error(e);
        setIsPlayingAudio(false);
        alert("Erro ao gerar áudio.");
    }
  };

  // Reusable Toolbar Component for Sections with PDF, Word, and Print
  const SectionToolbar = ({ section }: { section: ExportSection }) => (
    <div className="flex items-center gap-1 sm:gap-2">
        <button 
            onClick={() => handleExport('PDF', section)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded transition-colors"
            title="Exportar PDF"
        >
            <DownloadIcon className="w-4 h-4" />
        </button>
        <button 
            onClick={() => handleExport('WORD', section)}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition-colors"
            title="Exportar Word"
        >
            <FileWordIcon className="w-4 h-4" />
        </button>
        <button 
            onClick={() => handleExport('PRINT', section)} 
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
            title="Imprimir"
        >
            <PrinterIcon className="w-4 h-4" />
        </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 transition-colors relative">
      {/* Processing Overlay */}
      {isProcessing && <LoadingOverlay />}

      {/* Main Tabs / Toolbar */}
      <div className="flex justify-between items-center border-b border-rose-300 dark:border-slate-800 print:hidden shrink-0 bg-white dark:bg-slate-900 transition-colors">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('NOTE')}
            className={`py-3 px-4 text-sm font-bold text-center transition-colors duration-200 border-b-2 whitespace-nowrap ${
              activeTab === 'NOTE'
                ? 'border-pink-600 text-pink-700 dark:text-pink-400 bg-pink-50 dark:bg-slate-800'
                : 'border-transparent text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Nota Clínica
          </button>
           <button
            onClick={() => setActiveTab('LABS')}
            className={`py-3 px-4 text-sm font-bold text-center transition-colors duration-200 border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'LABS'
                ? 'border-pink-600 text-pink-700 dark:text-pink-400 bg-pink-50 dark:bg-slate-800'
                : 'border-transparent text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <TableIcon className="w-4 h-4" /> Laboratório
          </button>
          <button
            onClick={() => setActiveTab('ICD')}
            className={`py-3 px-4 text-sm font-bold text-center transition-colors duration-200 border-b-2 whitespace-nowrap ${
              activeTab === 'ICD'
                ? 'border-pink-600 text-pink-700 dark:text-pink-400 bg-pink-50 dark:bg-slate-800'
                : 'border-transparent text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Códigos CID-10
          </button>
          <button
            onClick={() => setActiveTab('INSTRUCTIONS')}
            className={`py-3 px-4 text-sm font-bold text-center transition-colors duration-200 border-b-2 whitespace-nowrap ${
              activeTab === 'INSTRUCTIONS'
                ? 'border-pink-600 text-pink-700 dark:text-pink-400 bg-pink-50 dark:bg-slate-800'
                : 'border-transparent text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Para os Pais
          </button>
        </div>
        
        {/* Global Actions (Full Chart) with 3 clear options */}
        <div className="flex items-center gap-1 sm:gap-2 pr-4 shrink-0">
             <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 hidden lg:inline">Prontuário Completo:</span>
             <button 
                onClick={() => handleExport('PDF', 'FULL')}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded transition-colors"
                title="Exportar Prontuário PDF"
            >
                <DownloadIcon className="w-5 h-5" />
            </button>
             <button 
                onClick={() => handleExport('WORD', 'FULL')}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors"
                title="Exportar Prontuário Word"
            >
                <FileWordIcon className="w-5 h-5" />
            </button>
            <button 
                onClick={() => handleExport('PRINT', 'FULL')}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Imprimir Prontuário"
            >
                <PrinterIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto p-6 bg-rose-50/20 dark:bg-slate-950 print:bg-white print:p-0 print:overflow-visible min-h-0">
        
        {/* CLINICAL NOTE (SOAP/STRUCTURED) */}
        <div className={activeTab === 'NOTE' ? 'block h-full' : 'hidden print:block'}>
          <div className="space-y-4 h-full flex flex-col">
            <div className="flex justify-between items-start print:hidden shrink-0">
               <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                 <FileTextIcon className="w-5 h-5 text-pink-700 dark:text-pink-500" />
                 Nota Detalhada
               </h3>
               <div className="flex items-center gap-2">
                   {/* Specific Actions for Note */}
                   <SectionToolbar section="NOTE" />
                   <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                   <button 
                    onClick={() => handleTTS(result.clinicalNote)}
                    className="text-xs flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-rose-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                    disabled={isPlayingAudio}
                   >
                     <Volume2Icon className={`w-3 h-3 ${isPlayingAudio ? 'animate-pulse text-pink-600' : ''}`} />
                     {isPlayingAudio ? 'Ouvindo...' : 'Ouvir'}
                   </button>
                   <button 
                    onClick={() => handleCopy(result.clinicalNote, 'note')}
                    className="text-xs flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-slate-700 rounded hover:bg-rose-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                   >
                     {copiedSection === 'note' ? <CheckIcon className="w-3 h-3 text-green-600" /> : <ClipboardIcon className="w-3 h-3" />}
                     {copiedSection === 'note' ? 'Copiado' : 'Copiar'}
                   </button>
               </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-rose-300 dark:border-slate-800 shadow-sm dark:shadow-none print:shadow-none print:border-none flex-grow transition-colors relative">
               {!result.clinicalNote.includes('{{TABELA_EXAMES}}') && labs.length > 0 && (
                   <div className="absolute top-2 right-2 text-[10px] text-orange-500 bg-orange-50 dark:bg-slate-800 dark:text-orange-400 px-2 py-1 rounded border border-orange-200 dark:border-slate-600">
                       Aviso: Tag {'{{TABELA_EXAMES}}'} removida.
                   </div>
               )}
              <textarea
                value={result.clinicalNote}
                onChange={(e) => handleNoteChange(e.target.value)}
                className="w-full h-full resize-none border-transparent focus:border-rose-400 dark:focus:border-slate-600 focus:ring-0 p-2 text-slate-900 dark:text-slate-200 leading-relaxed font-mono text-sm bg-white dark:bg-slate-900 transition-colors"
                placeholder="A nota gerada aparecerá aqui..."
              />
            </div>
          </div>
        </div>

        {/* LABS EDITABLE TABLE */}
        <div className={activeTab === 'LABS' ? 'block h-full' : 'hidden'}>
            <div className="flex justify-between items-start mb-4 mt-2">
               <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                 <TableIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                 Tabela de Exames
               </h3>
               <div className="flex items-center gap-2">
                   <SectionToolbar section="LABS" />
                   <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                   <button 
                      onClick={addLabItem}
                      className="text-xs flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors font-bold shadow-sm"
                   >
                     <PlusIcon className="w-3 h-3" /> Adicionar
                   </button>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                       <thead className="text-xs text-slate-700 dark:text-slate-200 uppercase bg-slate-100 dark:bg-slate-800 border-b dark:border-slate-700">
                           <tr>
                               <th className="px-4 py-3">Exame</th>
                               <th className="px-4 py-3">Resultado</th>
                               <th className="px-4 py-3">Unidade</th>
                               <th className="px-4 py-3">Ref. Pediátrica</th>
                               <th className="px-4 py-3">Status</th>
                               <th className="px-4 py-3 w-10"></th>
                           </tr>
                       </thead>
                       <tbody>
                           {labs.length === 0 && (
                               <tr>
                                   <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                                       Nenhum exame registrado.
                                   </td>
                               </tr>
                           )}
                           {labs.map((item, index) => (
                               <tr key={index} className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                   <td className="p-2">
                                       <input 
                                         value={item.name} 
                                         onChange={(e) => handleLabChange(index, 'name', e.target.value)}
                                         className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:ring-0 rounded p-1 font-medium text-slate-900 dark:text-white transition-all"
                                       />
                                   </td>
                                   <td className="p-2">
                                       <input 
                                         value={item.result} 
                                         onChange={(e) => handleLabChange(index, 'result', e.target.value)}
                                         className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:ring-0 rounded p-1 transition-all"
                                       />
                                   </td>
                                   <td className="p-2">
                                       <input 
                                         value={item.unit} 
                                         onChange={(e) => handleLabChange(index, 'unit', e.target.value)}
                                         className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:ring-0 rounded p-1 text-slate-500"
                                       />
                                   </td>
                                   <td className="p-2">
                                       <input 
                                         value={item.reference} 
                                         onChange={(e) => handleLabChange(index, 'reference', e.target.value)}
                                         className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:ring-0 rounded p-1 text-slate-500"
                                       />
                                   </td>
                                   <td className="p-2">
                                       <input 
                                         value={item.status} 
                                         onChange={(e) => handleLabChange(index, 'status', e.target.value)}
                                         className={`w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:ring-0 rounded p-1 font-bold ${
                                             item.status.includes('Alto') ? 'text-red-600' :
                                             item.status.includes('Baixo') ? 'text-blue-600' :
                                             item.status.includes('Atenção') ? 'text-yellow-600' :
                                             'text-emerald-600'
                                         }`}
                                       />
                                   </td>
                                   <td className="p-2 text-center">
                                       <button 
                                        onClick={() => deleteLabItem(index)}
                                        className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                       >
                                           <Trash2Icon className="w-4 h-4" />
                                       </button>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
            </div>
        </div>

        {/* ICD CODES */}
        <div className={activeTab === 'ICD' ? 'block' : 'hidden print:block print:mt-8'}>
             <div className="flex justify-between items-start mb-4 mt-2">
               <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                 <ActivityIcon className="w-5 h-5 text-pink-700 dark:text-pink-500" />
                 Codificação
               </h3>
               <SectionToolbar section="ICD" />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 print:hidden">
                <div className="flex gap-2 items-end">
                    <div className="w-24 shrink-0">
                        <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 block">Código</label>
                        <input
                            value={newIcdCode}
                            onChange={(e) => setNewIcdCode(e.target.value)}
                            placeholder="Ex: J00"
                            className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                    </div>
                    <div className="flex-grow">
                        <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 block">Descrição</label>
                        <input
                            value={newIcdDesc}
                            onChange={(e) => setNewIcdDesc(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddIcd()}
                            placeholder="Descrição da condição"
                            className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                    </div>
                    <button 
                        onClick={handleAddIcd} 
                        className="bg-pink-600 hover:bg-pink-700 text-white p-2 rounded transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid gap-3">
              {result.icd10.map((code, idx) => (
                <div key={idx} className="flex items-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-rose-200 dark:border-slate-700 shadow-sm hover:border-pink-300 dark:hover:border-slate-500 transition-colors group">
                  <div className="bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 font-bold px-3 py-1 rounded text-sm mr-4 min-w-[80px] text-center print:bg-white print:border">
                    {code.code}
                  </div>
                  <div className="text-slate-800 dark:text-slate-300 font-medium">
                    {code.description}
                  </div>
                  <button 
                    onClick={() => handleRemoveIcd(idx)}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-2 transition-all print:hidden"
                  >
                      <Trash2Icon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
        </div>

        {/* PATIENT INSTRUCTIONS */}
        <div className={activeTab === 'INSTRUCTIONS' ? 'block h-full' : 'hidden print:block print:break-before-page'}>
            <div className="flex justify-between items-center mb-4 mt-2 shrink-0">
               <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                 <HeartIcon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                 Instruções para os Pais
               </h3>
               
               {/* Enhanced Toolbar for Instructions */}
               <div className="flex items-center gap-2 print:hidden">
                  <button 
                    onClick={() => handleExport('PDF', 'INSTRUCTIONS')}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold shadow-md transition-all active:scale-95"
                    title="Exportar Apenas Instruções (PDF)"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Exportar PDF</span>
                  </button>
                  <button 
                    onClick={() => handleExport('WORD', 'INSTRUCTIONS')}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors"
                    title="Exportar para Word"
                  >
                    <FileWordIcon className="w-4 h-4" />
                  </button>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                  <button 
                    onClick={() => handleCopy(result.patientInstructions, 'instructions')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-slate-700 rounded text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                  >
                    {copiedSection === 'instructions' ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                    <span className="hidden sm:inline">{copiedSection === 'instructions' ? 'Copiado' : 'Copiar'}</span>
                  </button>
               </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-rose-300 dark:border-slate-800 shadow-sm dark:shadow-none print:shadow-none print:border-none flex-grow h-full transition-colors">
              <textarea
                value={result.patientInstructions}
                onChange={(e) => handleInstructionsChange(e.target.value)}
                className="w-full h-full resize-none border-transparent focus:border-rose-400 dark:focus:border-slate-600 focus:ring-0 p-0 text-slate-900 dark:text-slate-200 leading-relaxed font-sans text-sm bg-white dark:bg-slate-900 transition-colors"
              />
            </div>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;