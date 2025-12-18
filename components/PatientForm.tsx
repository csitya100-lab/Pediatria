import React, { useState, useRef, useEffect } from 'react';
import { PatientInfo } from '../types';
import { MicIcon, StopCircleIcon } from './Icons';

interface PatientFormProps {
  patientInfo: PatientInfo;
  setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfo>>;
}

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const InputWithMic: React.FC<{
  label: string;
  id: string;
  name: keyof PatientInfo;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  onDictate: (name: keyof PatientInfo, text: string) => void;
  className?: string;
}> = ({ label, id, name, value, onChange, placeholder, type = 'text', onDictate, className }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const Recognition = SpeechRecognition || webkitSpeechRecognition;

    if (Recognition) {
      const recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'pt-BR'; 

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onDictate(name, transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [name, onDictate]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="relative">
        <input
          type={type}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder || label}
          className="w-full rounded-md border-rose-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-pink-600 focus:ring-pink-600 text-xs px-2 py-1.5 border placeholder:text-rose-400 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100 font-medium h-8 transition-colors"
        />
        {recognitionRef.current && (
          <button
            type="button"
            onClick={toggleListening}
            className={`absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors ${
              isListening ? 'bg-red-100 text-red-600' : 'bg-transparent text-rose-400 dark:text-slate-400 hover:text-pink-700 dark:hover:text-pink-400'
            }`}
            title={isListening ? 'Parar' : 'Ditar'}
          >
            {isListening ? <StopCircleIcon className="w-3 h-3 animate-pulse" /> : <MicIcon className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
};

const PatientForm: React.FC<PatientFormProps> = ({ patientInfo, setPatientInfo }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPatientInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleDictate = (name: keyof PatientInfo, text: string) => {
    setPatientInfo(prev => ({ ...prev, [name]: text }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputWithMic 
        label="Nome" 
        id="name" 
        name="name" 
        value={patientInfo.name} 
        onChange={handleChange} 
        onDictate={handleDictate}
        placeholder="Nome do Paciente" 
        className="w-40 sm:w-52"
      />
      <InputWithMic 
        label="Idade" 
        id="age" 
        name="age" 
        value={patientInfo.age} 
        onChange={handleChange} 
        onDictate={handleDictate}
        placeholder="Idade" 
        className="w-20"
      />
      <div className="w-24">
        <select
          id="gender"
          name="gender"
          value={patientInfo.gender}
          onChange={handleChange}
          className="w-full rounded-md border-rose-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-pink-600 focus:ring-pink-600 text-xs px-2 border h-8 text-slate-900 dark:text-slate-100 font-medium transition-colors"
        >
          <option value="Masculino">Masc</option>
          <option value="Feminino">Fem</option>
          <option value="Outro">Outro</option>
        </select>
      </div>
      <div className="w-32">
         <input
          type="date"
          id="visitDate"
          name="visitDate"
          value={patientInfo.visitDate}
          onChange={handleChange}
          className="w-full rounded-md border-rose-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-pink-600 focus:ring-pink-600 text-xs px-2 border h-8 text-slate-900 dark:text-slate-100 font-medium transition-colors"
        />
      </div>
    </div>
  );
};

export default PatientForm;