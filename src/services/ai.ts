/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Explanacao {
  tituloAmigavel: string;
  explicacao: string;
  paraQuemE: string;
  quemGanha?: string;
  quemPerde?: string;
  impacto: 'baixo' | 'medio' | 'alto';
  beneficiaPovo: boolean; // true para verde, false para vermelho
  urgente: boolean;
  critico?: boolean; // Novo campo para "Voto Crítico"
}

// Simple in-memory cache to avoid redundant calls during the session
const sessionCache: Record<string, Explanacao> = {};

export const explicarProposicao = async (ementa: string, siglaTipo: string, numero: number, ano: number): Promise<Explanacao> => {
  const cacheKey = `${siglaTipo}_${numero}_${ano}`;
  if (sessionCache[cacheKey]) return sessionCache[cacheKey];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explique esta proposição legislativa (${siglaTipo} ${numero}/${ano}) em linguagem EXTREMAMENTE simples para uma pessoa comum entender.
      
      Se for PEC, destaque que é uma mudança gigante na Constituição.
      Se for PDL/PDC, destaque que quer anular regra do presidente.
      Se for PRC, destaque que é regra interna.
      Se for REQ/CPI, destaque que é investigação pesada.
      Se for REP, diga que quer "tirar da gaveta".
      
      Ementa original: "${ementa}"
      
      Retorne um JSON com:
      - tituloAmigavel: Um título curto e chamativo (ex: "Geladeira mais barata para todos").
      - explicacao: Uma frase curta explicando o que muda na prática.
      - paraQuemE: Quem é o público alvo (ex: "Famílias pobres", "Empresas de tecnologia").
      - quemGanha: Quem se beneficia.
      - quemPerde: Quem é prejudicado ou terá que pagar a conta.
      - impacto: "baixo", "medio" ou "alto".
      - beneficiaPovo: booleano (true se ajuda a população geral/pobres, false se prioriza elite/grandes empresas/interesses próprios).
      - urgente: booleano (baseado na ementa, parece pedir urgência?).
      - critico: booleano (true se envolver salário mínimo, escala 6x1, privatização ou povos indígenas).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tituloAmigavel: { type: Type.STRING },
            explicacao: { type: Type.STRING },
            paraQuemE: { type: Type.STRING },
            quemGanha: { type: Type.STRING },
            quemPerde: { type: Type.STRING },
            impacto: { type: Type.STRING, enum: ['baixo', 'medio', 'alto'] },
            beneficiaPovo: { type: Type.BOOLEAN },
            urgente: { type: Type.BOOLEAN },
            critico: { type: Type.BOOLEAN },
          },
          required: ['tituloAmigavel', 'explicacao', 'paraQuemE', 'beneficiaPovo']
        }
      }
    });

    const result = JSON.parse(response.text || '{}') as Explanacao;
    sessionCache[cacheKey] = result;
    return result;
  } catch (error) {
    console.error("Erro ao explicar proposição:", error);
    return {
      tituloAmigavel: "Análise Social",
      explicacao: "Impacto sendo processado pelos dados governamentais.",
      paraQuemE: "Cidadão Brasileiro",
      impacto: 'baixo',
      beneficiaPovo: true,
      urgente: false
    };
  }
};

export const explicarVoto = async (voto: string, titulo: string, ementaSobre: string): Promise<Explanacao> => {
  const cacheKey = `voto_${voto}_${titulo.substring(0, 30)}`;
  if (sessionCache[cacheKey]) return sessionCache[cacheKey];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explique o significado do voto "${voto}" neste projeto: "${titulo}".
      Contexto adicional: "${ementaSobre}"
      
      Traduza isso para uma pessoa leiga entender o que acontece se o projeto passar ou não.
      Use o campo "tituloAmigavel" para dizer algo como: "Votou PARA baixar impostos" ou "Votou CONTRA a reforma".
      
      Retorne um JSON seguindo o mesmo padrão das proposições.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tituloAmigavel: { type: Type.STRING },
            explicacao: { type: Type.STRING },
            paraQuemE: { type: Type.STRING },
            quemGanha: { type: Type.STRING },
            quemPerde: { type: Type.STRING },
            impacto: { type: Type.STRING, enum: ['baixo', 'medio', 'alto'] },
            beneficiaPovo: { type: Type.BOOLEAN },
            critico: { type: Type.BOOLEAN },
          },
          required: ['tituloAmigavel', 'explicacao', 'paraQuemE', 'beneficiaPovo']
        }
      }
    });

    const result = JSON.parse(response.text || '{}') as Explanacao;
    sessionCache[cacheKey] = result;
    return result;
  } catch (error) {
    console.error("AI Voto Error:", error);
    return {
      tituloAmigavel: `Votou ${voto}`,
      explicacao: "Análise técnica em andamento.",
      paraQuemE: "Público Geral",
      impacto: 'baixo',
      beneficiaPovo: true,
      urgente: false
    };
  }
};
