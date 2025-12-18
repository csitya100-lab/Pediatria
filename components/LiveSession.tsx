import React, { useEffect, useRef, useState } from 'react';
import { getAI } from '../services/geminiService';
import { LiveServerMessage, Modality } from '@google/genai';
import { MicIcon, StopCircleIcon, ActivityIcon } from './Icons';

// Audio Utils
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output.buffer;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const LiveSession: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Desconectado");
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  
  // Output Audio
  const nextStartTimeRef = useRef<number>(0);
  
  const startSession = async () => {
    try {
      setStatus("Conectando...");
      const ai = getAI();
      
      // Setup Audio Context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }); // Input requires 16k usually, but model accepts PCM
      // Note: Live API returns 24000Hz. Input typically 16000Hz.
      // Let's use 24000 for output context to match model.
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Connect to Gemini Live
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: "Você é um assistente médico sênior útil e conciso. Responda em português.",
        },
        callbacks: {
            onopen: async () => {
                setStatus("Conectado! Fale agora.");
                setIsActive(true);
                
                // Start Mic Stream
                mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                const inputCtx = audioContextRef.current!;
                sourceRef.current = inputCtx.createMediaStreamSource(mediaStreamRef.current);
                processorRef.current = inputCtx.createScriptProcessor(4096, 1, 1);
                
                processorRef.current.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Calculate volume for UI
                    let sum = 0;
                    for(let i=0; i<inputData.length; i++) sum += inputData[i]*inputData[i];
                    setVolume(Math.sqrt(sum/inputData.length) * 100);

                    const pcmData = floatTo16BitPCM(inputData);
                    
                    // Encode to base64 for Blob not needed if using SDK's sendRealtimeInput which takes Blob or base64
                    // SDK expects Blob object with data as base64 string
                    
                    const bytes = new Uint8Array(pcmData);
                    let binary = '';
                    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                    const base64 = btoa(binary);

                    sessionPromiseRef.current?.then(session => {
                        session.sendRealtimeInput({
                            media: {
                                mimeType: "audio/pcm;rate=16000",
                                data: base64
                            }
                        });
                    });
                };
                
                sourceRef.current.connect(processorRef.current);
                processorRef.current.connect(inputCtx.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
                const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioData) {
                    const audioBytes = base64ToUint8Array(audioData);
                    const audioBuffer = await decodeAudioData(audioBytes, outputCtx);
                    
                    const source = outputCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputCtx.destination);
                    
                    const now = outputCtx.currentTime;
                    const startTime = Math.max(now, nextStartTimeRef.current);
                    source.start(startTime);
                    nextStartTimeRef.current = startTime + audioBuffer.duration;
                }
            },
            onclose: () => {
                setStatus("Desconectado");
                setIsActive(false);
            },
            onerror: (e) => {
                console.error(e);
                setStatus("Erro na conexão");
                setIsActive(false);
            }
        }
      });

    } catch (e) {
      console.error(e);
      setStatus("Erro ao iniciar");
    }
  };

  const stopSession = () => {
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();
    sessionPromiseRef.current?.then(s => s.close());
    setIsActive(false);
    setStatus("Desconectado");
    setVolume(0);
  };

  // Helper to decode raw PCM from Gemini (24kHz default usually)
  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
     // Gemini sends raw PCM 16-bit little endian. No header.
     // We need to convert manually to AudioBuffer.
     const int16Data = new Int16Array(data.buffer);
     const floatData = new Float32Array(int16Data.length);
     for(let i=0; i<int16Data.length; i++) {
         floatData[i] = int16Data[i] / 32768.0;
     }
     
     const buffer = ctx.createBuffer(1, floatData.length, 24000); // 24kHz is standard model output
     buffer.copyToChannel(floatData, 0);
     return buffer;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-xl text-white shadow-xl border border-slate-700">
      <div className="relative mb-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-red-500/20' : 'bg-slate-700'}`}>
             {isActive ? (
                 <div className="absolute inset-0 rounded-full border-4 border-red-500" style={{ transform: `scale(${1 + volume/50})`, opacity: 0.5 + volume/100 }} />
             ) : null}
             <ActivityIcon className={`w-8 h-8 ${isActive ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
        </div>
      </div>
      
      <h3 className="text-lg font-bold mb-1">Live Assistant</h3>
      <p className="text-xs text-slate-400 mb-6">{status}</p>
      
      <button
        onClick={isActive ? stopSession : startSession}
        className={`px-8 py-3 rounded-full font-bold text-sm shadow-lg transition-all transform hover:scale-105 ${
            isActive 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        }`}
      >
        {isActive ? (
            <span className="flex items-center gap-2"><StopCircleIcon className="w-5 h-5" /> Parar Sessão</span>
        ) : (
            <span className="flex items-center gap-2"><MicIcon className="w-5 h-5" /> Iniciar Conversa</span>
        )}
      </button>
      
      <p className="text-[10px] text-slate-500 mt-4 text-center max-w-xs">
        Use o Gemini 2.5 Live para conversar em tempo real sobre casos clínicos.
      </p>
    </div>
  );
};

export default LiveSession;
