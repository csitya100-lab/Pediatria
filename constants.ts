import { PatientInfo } from './types';

export const INITIAL_PATIENT_INFO: PatientInfo = {
  name: '',
  age: '',
  gender: 'Masculino',
  visitDate: new Date().toISOString().split('T')[0],
};

// --- TEMPLATES ---

export const TEMPLATE_SOAP = `
# Subjetivo
- Queixa principal e história da doença atual.
- Histórico médico pregresso relevante.

# Objetivo
## Sinais Vitais
- Sinais vitais.

## Exame Físico
- Exame físico detalhado.

## Exames Laboratoriais
- (INSERIR TABELA DE LABORATÓRIO AQUI)

# Avaliação
- Diagnósticos e hipóteses.

# Plano
- Conduta, prescrições e orientações.
`;

export const TEMPLATE_PEDIATRIC = `
# Informações do paciente
## Nome
- Nome do paciente.
## Idade
- Idade do paciente.
## Escola
- Série ou grau escolar, se mencionado
## Outras informações relevantes
- Escreva qualquer informação sociocultural adicional relevante sobre o paciente, incluindo histórico familiar e social.

# Histórico do paciente
## Alergias
- Descreva as alergias do paciente, se mencionadas.
## Medicações
- Liste as medicações que o paciente toma, incluindo dosagens e horários, se mencionados.
## Vacinas
- Liste as vacinas que o paciente tomou, se mencionadas
## Condições médicas
- Descreva o histórico de condições médicas e doenças do paciente, incluindo a data de início e informações sobre tratamento e controle. Liste cada condição em um novo item da lista.
## Hábitos
- Descreva os hábitos do paciente, como tabagismo, consumo de álcool e atividade física.
## Desenvolvimento
- Desenvolvimento neuropsicomotor da criança, incluindo marcos motores, de linguagem e cognitivos, se mencionados
- Inclua informações sobre o desenvolvimento puberal, se mencionado (ex: Tanner)
## Alimentação
- Informações sobre a alimentação da criança, como aleitamento materno, introdução alimentar, tipo de dieta, etc, se mencionado

# Subjetivo
## Queixa principal
- A principal queixa do paciente e/ou seus responsáveis.
## História da doença atual
- Detalhes sobre o desenvolvimento da doença atual.

# Objetivo
## Exames Laboratoriais
- (INSERIR TABELA DE LABORATÓRIO AQUI)

## Sinais vitais e dados antropométricos
- Peso, Altura, IMC, etc.

## Exame Físico
- Descrição do exame físico.

# Avaliação
## Avaliação
- Avaliação do médico sobre o caso e diagnósticos.

# Planos
## Medicações prescritas
- Medicações prescritas.
## Vacinas solicitadas
- Vacinas prescritas ou recomendadas.
## Exames solicitados
- Exames solicitados.
## Acompanhamento
- Retorno.
## Encaminhamento
- Encaminhamentos.
## Orientações
- Orientações gerais.
## Atestados
- Atestados emitidos.
`;

export const TEMPLATE_NEURO = `
# Informações do paciente
## Nome
- Nome.
## Idade
- Idade detalhada.
## Ocupação/Ambiente escolar
- Escola/Série.
## Outras informações relevantes
- Dinâmica familiar e social.

# Histórico do paciente
## Doenças pré-natais
- Gestação e parto.
## Doenças peri-natais
- Período neonatal.
## Alergias
- Alergias.
## Medicações
- Medicações em uso.
## Condições médicas
- Histórico de doenças.
## Cirurgias
- Procedimentos prévios.
## Desenvolvimento neuropsicomotor
- Marcos motores, fala, cognitivo, social.
## Hábitos
- Sono, tela, alimentação.

# Subjetivo
## Queixa principal
- Motivo da consulta.
## História da doença atual
- Sintomas, evolução, comportamento.

# Objetivo
## Exames Laboratoriais e Imagem
- (INSERIR TABELA DE LABORATÓRIO AQUI)
- Resultados de exames de imagem ou EEG (texto).

## Exame Físico e Neurológico
- Descrição detalhada.
## Sinais vitais e dados antropométricos
- Sinais vitais.

# Avaliação
## Avaliação
- Hipóteses diagnósticas (ex: TDAH, TEA).

# Planos
## Medicações prescritas
- Prescrições.
## Exames solicitados
- Solicitações.
## Acompanhamento
- Retorno.
## Encaminhamento
- Terapias (Fono, T.O, Psicologia).
## Orientações
- Manejo comportamental, rotina.
## Atestados
- Atestados.
`;

// --- MOCKS ---

export const MOCK_TRANSCRIPT_SOAP = `Médico: Bom dia, Sra. Silva. Como o Leo está hoje?
Mãe: Oi Doutor. Ele está bem na maior parte do tempo, mas tem puxado muito a orelha direita desde ontem, e teve febre ontem à noite.
Médico: Entendo. A senhora mediu a febre?
Mãe: Sim, estava em 39,2 graus. Demos Tylenol e baixou um pouco.
Médico: Certo. Ele teve nariz escorrendo ou tosse?
Mãe: Um pouco de nariz escorrendo, coriza clara. Tosse não muito.
Médico: Tudo bem, vamos dar uma olhada. Vou examinar os ouvidos dele.
(Pausa para exame)
Médico: Então, o ouvido direito está vermelho e abaulado. É uma otite média aguda.
Mãe: Ah, tadinho.
Médico: Vou prescrever Amoxicilina 80mg/kg/dia por 7 dias. Continue com o Tylenol para dor.
Mãe: Obrigada, Doutor.`;

export const MOCK_TRANSCRIPT_PEDIATRIC = `Médico: Olá, tudo bem? Viemos para a consulta de rotina da Sofia de 6 meses?
Mãe: Isso mesmo, doutor.
Médico: Como está a alimentação?
Mãe: Ela ainda está no peito exclusivo, mas vou voltar a trabalhar mês que vem.
Médico: Ótimo. Vamos começar a introdução alimentar então. Frutas amassadas nos lanches e papinha salgada no almoço.
Médico: E as vacinas?
Mãe: Estão todas em dia, trouxe a caderneta.
Médico: Perfeito. No exame físico ela está ótima. Ganhou 600g desde o mês passado, curva de crescimento excelente. Coração e pulmões limpos. Desenvolvimento motor adequado, já senta com apoio?
Mãe: Sim, senta bem firmizinha já.
Médico: Ótimo. Vou pedir um hemograma de rotina para checar anemia fisiológica. E marcamos retorno em 1 mês.
Mãe: Certo. Ah, ela tem regurgitado um pouco.
Médico: Se não tiver perda de peso nem choro excessivo, é normal dessa fase. Mantenha ela em pé após mamar.`;

export const MOCK_TRANSCRIPT_NEURO = `Médico: Bom dia. O que traz o Pedro (8 anos) aqui hoje?
Mãe: Doutor, a escola tem reclamado muito. Dizem que ele não para quieto, atrapalha os colegas e não termina as tarefas.
Médico: Entendi. Isso acontece em casa também?
Mãe: Sim, para fazer o dever de casa é uma luta. Ele levanta a cada 5 minutos. Perde o lápis, esquece a mochila.
Médico: Como foi o desenvolvimento dele? Demorou para falar ou andar?
Mãe: Não, andou com 1 ano e falou cedo. Mas sempre foi "ligado no 220". O sono é agitado também.
Médico: Histórico familiar de TDAH?
Mãe: O pai dele é igualzinho.
Médico: Certo. No exame neurológico não vejo déficits focais. Ele é colaborativo mas muito inquieto na cadeira.
Médico: Minha hipótese principal é TDAH tipo combinado. Vamos precisar de relatórios da escola.
Mãe: E medicação?
Médico: Antes de medicar, vou pedir uma avaliação neuropsicológica e um eletroencefalograma para descartar ausências.
Médico: Vou encaminhar também para Terapia Ocupacional para ajudar na organização.
Mãe: Entendido.
Médico: Mude a rotina de sono, tire as telas 2 horas antes de dormir.`;