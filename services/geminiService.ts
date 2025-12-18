
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult, PatientInfo, ConsultationType, LabItem } from "../types";
import { TEMPLATE_SOAP, TEMPLATE_PEDIATRIC, TEMPLATE_NEURO } from "../constants";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is not defined in the environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

export const getAI = () => ai;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    clinicalNote: { 
      type: Type.STRING, 
      description: "A nota clínica completa formatada em Markdown, seguindo ESTRITAMENTE a estrutura solicitada. Use o placeholder {{TABELA_EXAMES}} onde a tabela de exames deveria estar." 
    },
    labResults: {
      type: Type.ARRAY,
      description: "Dados estruturados dos exames laboratoriais.",
      items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Nome do exame (ex: Hemoglobina)" },
            result: { type: Type.STRING, description: "Resultado numérico" },
            unit: { type: Type.STRING, description: "Unidade (ex: g/dL)" },
            reference: { type: Type.STRING, description: "Intervalo de referência (ex: 11.5 - 14.5)" },
            status: { type: Type.STRING, description: "Status (ex: Normal, Alto, Baixo)" }
        },
        required: ["name", "result", "unit", "reference", "status"]
      }
    },
    icd10: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING, description: "Código CID-10" },
          description: { type: Type.STRING, description: "Descrição do código em Português" },
        },
        required: ["code", "description"],
      },
    },
    patientInstructions: {
      type: Type.STRING,
      description: "Instruções para os pais em linguagem simples e clara.",
    },
  },
  required: ["clinicalNote", "labResults", "icd10", "patientInstructions"],
};

export const generateClinicalNote = async (
  transcript: string,
  examsInput: string,
  patientInfo: PatientInfo,
  consultationType: ConsultationType
): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing");

  let structureInstruction = "";
  if (consultationType === 'SOAP') structureInstruction = TEMPLATE_SOAP;
  else if (consultationType === 'PEDIATRIC') structureInstruction = TEMPLATE_PEDIATRIC;
  else if (consultationType === 'NEURO') structureInstruction = TEMPLATE_NEURO;

  const prompt = `
    Você é um especialista sênior em Pediatria e documentação clínica no Brasil.
    Gere a nota clínica no formato JSON conforme o schema.
    TIPO DE CONSULTA: ${consultationType}
    ESTRUTURA: ${structureInstruction}
    PACIENTE: ${patientInfo.name}, ${patientInfo.age}
    ENTRADA LAB: ${examsInput}
    TRANSCRICAO: ${transcript}
    Idiomas: pt-BR.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.2,
    },
  });

  return JSON.parse(response.text!) as AnalysisResult;
};

/**
 * Especializado em extrair APENAS dados de exames laboratoriais de texto ou ditado.
 */
export const parseLabExams = async (examsInput: string, patientAge: string): Promise<LabItem[]> => {
  if (!apiKey) throw new Error("API Key is missing");
  if (!examsInput.trim()) return [];

  const labSchema = {
    type: Type.OBJECT,
    properties: {
      results: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            result: { type: Type.STRING },
            unit: { type: Type.STRING },
            reference: { type: Type.STRING },
            status: { type: Type.STRING }
          },
          required: ["name", "result", "unit", "reference", "status"]
        }
      }
    },
    required: ["results"]
  };

  const prompt = `
    Extraia dados laboratoriais do seguinte texto: "${examsInput}".
    Idade do paciente: ${patientAge}.
    Use referências pediátricas brasileiras.
    Retorne um JSON com o campo "results" contendo a lista de exames estruturados.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: labSchema,
      temperature: 0.1,
    },
  });

  const parsed = JSON.parse(response.text!);
  return parsed.results as LabItem[];
};

export const askMedicalQuestion = async (query: string, useThinking: boolean = false): Promise<string> => {
  const model = useThinking ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
  const config = useThinking ? { thinkingConfig: { thinkingBudget: 32768 } } : {};
  
  const response = await ai.models.generateContent({
    model,
    contents: query,
    config
  });
  return response.text || "";
};

export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");
  
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// --- Missing functions implemented below ---

/**
 * Analisa uma imagem médica e responde a uma consulta usando modelo multimodal.
 */
export const analyzeMedicalImage = async (base64Image: string, prompt: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
        { text: prompt || "Analise esta imagem médica no contexto pediátrico." },
      ],
    },
  });

  return response.text || "";
};

/**
 * Gera uma imagem educacional médica de alta qualidade.
 */
export const generateEducationalImage = async (
  prompt: string, 
  imageSize: "1K" | "2K" | "4K" = "1K", 
  aspectRatio: string = "1:1"
): Promise<string | null> => {
  // Criando uma nova instância conforme diretrizes para garantir o uso da chave correta com modelos Pro
  const freshAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await freshAi.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: imageSize,
      },
    },
  });

  // Itera pelas partes para encontrar a imagem retornada em inlineData
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

/**
 * Edita uma imagem médica baseada em um prompt usando o modelo flash image.
 */
export const editMedicalImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  if (!apiKey) throw new Error("API Key is missing");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
        { text: prompt },
      ],
    },
  });

  // Busca a parte de imagem na resposta do modelo nano banana
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};
