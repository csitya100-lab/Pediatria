import React, { useState, useRef } from 'react';
import { askMedicalQuestion, analyzeMedicalImage, generateEducationalImage, editMedicalImage } from '../services/geminiService';
import { SearchIcon, BrainIcon, ImageIcon, WandIcon, UploadIcon, SparklesIcon, FileTextIcon, Volume2Icon } from './Icons';
import LiveSession from './LiveSession';

type ToolType = 'SEARCH' | 'IMAGE' | 'LIVE';

const ToolsPanel: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>('SEARCH');
  
  // Search State
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Image State
  const [mediaPrompt, setMediaPrompt] = useState('');
  const [generatedMedia, setGeneratedMedia] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  
  // Settings
  const [imgSize, setImgSize] = useState<"1K"|"2K"|"4K">("1K");
  const [aspectRatio, setAspectRatio] = useState("1:1");

  // File Upload Helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Keep only base64 data
        const base64 = result.split(',')[1];
        setUploadedImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // HANDLERS
  const handleSearch = async () => {
    if (!query) return;
    setLoadingSearch(true);
    try {
        const res = await askMedicalQuestion(query, isThinking);
        setSearchResult(res);
    } catch (e: any) {
        setSearchResult("Erro: " + e.message);
    }
    setLoadingSearch(false);
  };

  const handleMediaAction = async (action: 'GEN_IMG' | 'EDIT_IMG' | 'ANALYZE') => {
    setLoadingMedia(true);
    setGeneratedMedia(null);
    try {
        if (action === 'GEN_IMG') {
            const res = await generateEducationalImage(mediaPrompt, imgSize, aspectRatio);
            setGeneratedMedia(res);
        } else if (action === 'EDIT_IMG' && uploadedImage) {
            const res = await editMedicalImage(uploadedImage, mediaPrompt);
            setGeneratedMedia(res);
        } else if (action === 'ANALYZE' && uploadedImage) {
            const res = await analyzeMedicalImage(uploadedImage, mediaPrompt);
            setSearchResult(res); // Use search result box for text analysis
            setActiveTool('SEARCH'); // Switch to view text
        }
    } catch (e: any) {
        alert("Erro: " + e.message);
    }
    setLoadingMedia(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      
      {/* Tool Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 p-2 gap-2 shrink-0">
         <button onClick={() => setActiveTool('SEARCH')} className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors whitespace-nowrap ${activeTool === 'SEARCH' ? 'bg-pink-100 text-pink-700 dark:bg-slate-800 dark:text-pink-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50'}`}>
             <SearchIcon className="w-4 h-4" /> Consultor Médico
         </button>
         <button onClick={() => setActiveTool('IMAGE')} className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors whitespace-nowrap ${activeTool === 'IMAGE' ? 'bg-pink-100 text-pink-700 dark:bg-slate-800 dark:text-pink-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50'}`}>
             <ImageIcon className="w-4 h-4" /> Imagens
         </button>
         <button onClick={() => setActiveTool('LIVE')} className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors whitespace-nowrap ${activeTool === 'LIVE' ? 'bg-pink-100 text-pink-700 dark:bg-slate-800 dark:text-pink-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50'}`}>
             <Volume2Icon className="w-4 h-4" /> Live Consultant
         </button>
      </div>

      <div className="p-4 overflow-y-auto flex-grow bg-slate-50 dark:bg-slate-950">
        
        {/* --- SEARCH & ANALYSIS TOOL --- */}
        {activeTool === 'SEARCH' && (
            <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <BrainIcon className="w-4 h-4 text-purple-500" /> Consultor Médico
                    </h3>
                    <textarea 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Faça uma pergunta complexa ou sobre protocolos recentes..."
                        className="w-full h-24 p-2 text-sm border border-slate-300 dark:border-slate-700 rounded mb-2 bg-transparent dark:text-white"
                    />
                    <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                            <input type="checkbox" checked={isThinking} onChange={e => setIsThinking(e.target.checked)} className="rounded text-pink-600 focus:ring-pink-600" />
                            Modo Thinking (Gemini 3.0 Pro)
                        </label>
                        <button 
                            onClick={handleSearch} 
                            disabled={loadingSearch || !query}
                            className="bg-pink-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-pink-700 disabled:opacity-50"
                        >
                            {loadingSearch ? 'Pesquisando...' : 'Consultar'}
                        </button>
                    </div>
                </div>

                {searchResult && (
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-800 prose prose-sm dark:prose-invert max-w-none">
                        <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Resposta</h4>
                        <div className="whitespace-pre-wrap text-sm">{searchResult}</div>
                    </div>
                )}
            </div>
        )}

        {/* --- IMAGE TOOLS --- */}
        {activeTool === 'IMAGE' && (
            <div className="space-y-4">
                 <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-800">
                     <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <ImageIcon className="w-4 h-4 text-emerald-500" /> Gerador & Editor
                    </h3>
                    
                    {/* Upload Section */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold mb-1 text-slate-500">Imagem de Referência (Para Editar/Analisar)</label>
                        <div className="flex items-center gap-2">
                            <label className="flex-1 cursor-pointer bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-xs text-center hover:bg-slate-200 transition-colors">
                                {uploadedImage ? "Imagem Carregada (Clique para trocar)" : "Carregar Imagem"}
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                            {uploadedImage && <span className="text-xs text-green-600 font-bold">OK</span>}
                        </div>
                    </div>

                    <textarea 
                        value={mediaPrompt}
                        onChange={e => setMediaPrompt(e.target.value)}
                        placeholder="Descreva a imagem para gerar, ou como editar a imagem enviada..."
                        className="w-full h-20 p-2 text-sm border border-slate-300 dark:border-slate-700 rounded mb-2 bg-transparent dark:text-white"
                    />

                     <div className="grid grid-cols-2 gap-2 mb-4">
                        <select value={imgSize} onChange={e => setImgSize(e.target.value as any)} className="text-xs border rounded p-1 dark:bg-slate-800 dark:text-white">
                            <option value="1K">1K</option>
                            <option value="2K">2K</option>
                            <option value="4K">4K</option>
                        </select>
                         <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="text-xs border rounded p-1 dark:bg-slate-800 dark:text-white">
                            <option value="1:1">1:1 (Quadrado)</option>
                            <option value="16:9">16:9 (Paisagem)</option>
                            <option value="9:16">9:16 (Retrato)</option>
                            <option value="4:3">4:3</option>
                            <option value="3:4">3:4</option>
                        </select>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleMediaAction('GEN_IMG')} disabled={loadingMedia} className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-emerald-700 disabled:opacity-50">
                            Gerar (Pro)
                        </button>
                        <button onClick={() => handleMediaAction('EDIT_IMG')} disabled={loadingMedia || !uploadedImage} className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-blue-700 disabled:opacity-50">
                            Editar (Nano)
                        </button>
                        <button onClick={() => handleMediaAction('ANALYZE')} disabled={loadingMedia || !uploadedImage} className="flex-1 bg-purple-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-purple-700 disabled:opacity-50">
                            Analisar
                        </button>
                    </div>
                    
                    {loadingMedia && <p className="text-xs text-center mt-2 animate-pulse text-emerald-600">Processando...</p>}
                 </div>

                 {generatedMedia && (
                     <div className="rounded-lg overflow-hidden border border-slate-300 shadow">
                         <img src={generatedMedia} alt="Generated" className="w-full h-auto" />
                     </div>
                 )}
            </div>
        )}

        {/* --- LIVE SESSION --- */}
        {activeTool === 'LIVE' && (
            <LiveSession />
        )}

      </div>
    </div>
  );
};

export default ToolsPanel;