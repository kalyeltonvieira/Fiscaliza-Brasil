/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// New AI Output Contract
export interface Explanacao {
  tipo: string;
  numero: string;
  titulo: string;
  objetivo: string;
  resumo_simples: string;
  quem_afeta: string[];
  impactos: {
    salario: boolean;
    impostos: boolean;
    beneficios: boolean;
    empresas: boolean;
  };
  impacto_resumido: string;
  status: string;
  tags: string[];
}

const sessionCache: Record<string, Explanacao> = {};

const cleanKey = (key: string) => key.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 128);

const getCachedExplanacao = async (key: string): Promise<Explanacao | null> => {
  const cKey = cleanKey(key);
  if (sessionCache[cKey]) return sessionCache[cKey];

  try {
    const docRef = doc(db, 'ai_cache', cKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Explanacao;
      sessionCache[cKey] = data;
      return data;
    }
  } catch (err) {
    console.error("Cache Read Error:", err);
  }
  return null;
};

const saveToCache = async (key: string, data: Explanacao) => {
  const cKey = cleanKey(key);
  sessionCache[cKey] = data;
  try {
    const docRef = doc(db, 'ai_cache', cKey);
    await setDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  } catch (err) {
    console.error("Cache Write Error:", err);
  }
};

export const explicarProposicao = async (ementa: string, siglaTipo: string, numero: number, ano: number, status?: string): Promise<Explanacao> => {
  const cacheKey = `projeto:${siglaTipo}:${numero}:${ano}`;
  const cached = await getCachedExplanacao(cacheKey);
  if (cached) return cached;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Note: gemini-3-flash-preview is the recommended high-speed model in AI studio
      contents: `Explique esta proposição legislativa do Brasil em linguagem EXTREMAMENTE simples (nível fundamental).
      
      Texto Original: "${ementa}"
      Tipo: ${siglaTipo} ${numero}/${ano}
      Status Atual: ${status || 'Apresentado'}

      Regras de Processamento:
      - Use frases curtas e diretas.
      - Sem juridiquês ou termos técnicos desnecessários.
      - Explique o que muda na prática para o cidadão.
      - Identifique quem ganha e quem perde.
      - Mantenha tom neutro, sem opinião política.

      Retorne estritamente um JSON com este contrato:
      - tipo: A sigla do tipo (PEC, PL, PLP, MPV, PLV, PDC, REQ)
      - numero: Formato "1234/2025"
      - titulo: Um título amigável e direto
      - objetivo: O que a proposta quer fazer
      - resumo_simples: Explicação para um trabalhador comum
      - quem_afeta: Lista de perfis (ex: ["trabalhadores CLT", "MEI"])
      - impactos: Objeto com booleanos para {salario, impostos, beneficios, empresas}
      - impacto_resumido: Resumo direto do impacto na vida real
      - status: Status do projeto
      - tags: Lista de palavras-chave (ex: ["trabalho", "imposto"])`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tipo: { type: Type.STRING },
            numero: { type: Type.STRING },
            titulo: { type: Type.STRING },
            objetivo: { type: Type.STRING },
            resumo_simples: { type: Type.STRING },
            quem_afeta: { type: Type.ARRAY, items: { type: Type.STRING } },
            impactos: {
              type: Type.OBJECT,
              properties: {
                salario: { type: Type.BOOLEAN },
                impostos: { type: Type.BOOLEAN },
                beneficios: { type: Type.BOOLEAN },
                empresas: { type: Type.BOOLEAN },
              }
            },
            impacto_resumido: { type: Type.STRING },
            status: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['tipo', 'numero', 'titulo', 'objetivo', 'resumo_simples', 'quem_afeta', 'impactos', 'impacto_resumido', 'status', 'tags']
        }
      }
    });

    const result = JSON.parse(response.text || '{}') as Explanacao;
    await saveToCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("AI Error:", error);
    throw error;
  }
};

/**
 * Função Feature: "Como isso me afeta?"
 */
export const comoIssoMeAfeta = async (ementa: string, perfil: "CLT" | "MEI" | "empresario" | "aposentado"): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise como este projeto afeta especificamente um perfil de "${perfil}".
      
      Projeto: "${ementa}"
      
      Responda em uma frase curta e direta começando com: "Se você é ${perfil}, isso pode..."`,
    });
    return response.text || "Análise indisponível no momento.";
  } catch (error) {
    return "Erro ao analisar impacto pessoal.";
  }
};

/**
 * Explica o significado de um voto nominal
 */
export const explicarVoto = async (voto: string, titulo: string, ementaSobre: string): Promise<string> => {
  const cacheKey = `voto_expl:${voto}:${titulo.substring(0, 30)}`;
  
  // 1. Verificar cache (simplificado para string)
  const cKey = cleanKey(cacheKey);
  try {
    const docRef = doc(db, 'ai_cache', cKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().explicacaoSimples;
    }
  } catch (err) {
    console.error("Cache Read Error:", err);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Traduza o voto "${voto}" do deputado neste projeto: "${titulo}".
      Contexto da proposta: "${ementaSobre}"

      Regras:
      1. Traduza o voto (SIM, NÃO, ABSTENÇÃO, etc.) de forma simples.
      2. Explique o significado do voto considerando o contexto (o que estava sendo votado e o objetivo).
      3. Use linguagem acessível para leigos (nível fundamental).
      4. Traduza o impacto do voto na prática (o que muda na vida real e quem é afetado).
      5. Evite termos técnicos ou jurídicos.
      
      Formato da resposta:
      "👉 O deputado foi [a favor/contra] um projeto que [objetivo simples]. Isso pode fazer com que [impacto real nas pessoas]."`,
    });

    const explicacao = response.text || "Análise indisponível.";
    
    // Salvar no cache
    try {
      const docRef = doc(db, 'ai_cache', cKey);
      await setDoc(docRef, { 
        explicacaoSimples: explicacao, 
        voto, 
        titulo, 
        updatedAt: serverTimestamp() 
      });
    } catch (err) {
      console.error("Cache Write Error:", err);
    }

    return explicacao;
  } catch (error) {
    console.error("AI Voto Error:", error);
    return `O deputado votou ${voto}. No momento não conseguimos detalhar o impacto social deste voto.`;
  }
};

/**
 * Gera um roteiro para o áudio do deputado
 */
export const generateAudioScript = async (nome: string, partido: string, temas: string[], resumoVotos: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explique o perfil do deputado ${nome} (${partido}) de forma simples.
      
      Dados:
      - Temas principais: ${temas.join(', ')}
      - Tendência de votos: ${resumoVotos}

      Regras:
      - Linguagem simples (como para alguém leigo).
      - Frases curtas e objetivas.
      - Sem termos técnicos ou jurídicos.
      - Não seja opinativo nem generalize ("sempre vota a favor").
      - Inclua exemplos simples do que ele já votou se disponível.
      
      Formato de saída: Texto contínuo, pronto para ser narrado em áudio.`,
    });
    return response.text || "Resumo indisponível.";
  } catch (error) {
    console.error("Audio Script Gen Error:", error);
    return `Olá. Estamos analisando o perfil do deputado ${nome}. Ele atua principalmente nos temas de ${temas.join(' e ')}.`;
  }
};
