export interface IcdCode {
  code: string;
  description: string;
}

export interface LabItem {
  name: string;
  result: string;
  unit: string;
  reference: string;
  status: string;
}

// Deprecating the rigid SoapNote object in favor of a flexible markdown string
// to support the complex templates requested.
export interface AnalysisResult {
  clinicalNote: string; // Markdown formatted note
  labResults: LabItem[]; // Structured lab data for the editable table
  icd10: IcdCode[];
  patientInstructions: string;
}

export interface PatientInfo {
  name: string;
  age: string;
  gender: string;
  visitDate: string;
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type ConsultationType = 'SOAP' | 'PEDIATRIC' | 'NEURO';
