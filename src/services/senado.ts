/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Proposicao, Votacao } from './camara';

export interface Senador {
  IdentificacaoParlamentar: {
    CodigoParlamentar: string;
    NomeParlamentar: string;
    NomeCompletoParlamentar: string;
    SexoParlamentar: string;
    UfParlamentar: string;
    SiglaPartidoParlamentar: string;
    UrlFotoParlamentar: string;
    EmailParlamentar: string;
  };
  Mandatos: {
    Mandato: any;
  };
}

/**
 * Busca a lista de senadores em exercício
 */
export const fetchSenadores = async (): Promise<Senador[]> => {
  try {
    const response = await fetch('/api/senado/senador/lista/atual');
    if (!response.ok) {
      throw new Error(`Failed to fetch senadores (HTTP ${response.status})`);
    }
    const data = await response.json();
    
    // Defensive navigation through the Senate API structure
    const lista = data.ListaParlamentarEmExercicio || data.ListaParlamentarResumo;
    if (!lista || !lista.Parlamentares) {
      return [];
    }
    
    const parlamentares = lista.Parlamentares.Parlamentar;
    if (!parlamentares) {
      return [];
    }
    
    // Senate API returns a single object if there's only one result, ensure it's an array for consistency
    return Array.isArray(parlamentares) ? parlamentares : [parlamentares];
  } catch (error) {
    console.error("fetchSenadores Error:", error);
    return [];
  }
};

/**
 * Busca e mapeia as matérias do Senado para o formato Proposicao
 */
export const fetchSenadorProposicoes = async (codigo: string): Promise<Proposicao[]> => {
  const response = await fetch(`/api/senado/senador/${codigo}/autorias`);
  if (!response.ok) return [];
  const data = await response.json();
  const list = data.ListaAutorias?.AutoriasParlamentar?.Autoria || [];
  
  return list.map((a: any) => ({
    id: parseInt(a.Materia.CodigoMateria),
    uri: ``,
    siglaTipo: a.Materia.SiglaSubtipoMateria,
    numero: parseInt(a.Materia.NumeroMateria),
    ano: parseInt(a.Materia.AnoMateria),
    ementa: a.Materia.EmentaMateria
  }));
};

/**
 * Busca as votações do Senado
 */
export const fetchSenadorVotacoes = async (codigo: string): Promise<Votacao[]> => {
  try {
    const response = await fetch(`/api/senado/senador/${codigo}/votacoes`);
    if (!response.ok) return [];
    const data = await response.json();
    const list = data.VotacaoParlamentar?.Votacoes?.Votacao || [];
    const ArrayVotacoes = Array.isArray(list) ? list : [list];

    return ArrayVotacoes.map((v: any) => ({
      id: v.CodigoSessaoVotacao,
      dataHoraRegistro: v.DataSessao,
      siglaOrgao: 'SENADO',
      voto: v.Voto,
      titulo: v.Materia?.DescricaoIdentificacao || 'Votacao Senado',
      proposicao: v.Materia ? {
        siglaTipo: v.Materia.SiglaMateria,
        numero: parseInt(v.Materia.NumeroMateria),
        ano: parseInt(v.Materia.AnoMateria),
        ementa: v.Materia.Ementa || v.Materia.DescricaoIdentificacao
      } : null
    }));
  } catch (e) {
    return [];
  }
};

/**
 * Busca histórico/carreira do Senador
 */
export const fetchSenadorHistorico = async (codigo: string): Promise<any[]> => {
  try {
    const response = await fetch(`/api/senado/senador/${codigo}`);
    if (!response.ok) return [];
    const data = await response.json();
    const mandatos = data.DetalheParlamentar?.Parlamentar?.Mandatos?.Mandato || [];
    const ArrayMandatos = Array.isArray(mandatos) ? mandatos : [mandatos];

    return ArrayMandatos.map((m: any) => ({
      anoInicio: m.AnoPrimeiraLegislatura,
      anoFim: m.AnoUltimaLegislatura,
      titulo: `Senador da República por ${m.UfParlamentar || 'UF'}`,
      entidade: `Senado Federal`
    }));
  } catch (e) {
    return [];
  }
};
