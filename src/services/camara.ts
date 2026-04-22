/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Deputado {
  id: number;
  uri: string;
  nome: string;
  siglaPartido: string;
  uriPartido: string;
  siglaUf: string;
  idLegislatura: number;
  urlFoto: string;
  email: string;
}

export interface Proposicao {
  id: number;
  uri: string;
  siglaTipo: string;
  codTipo: number;
  numero: number;
  ano: number;
  ementa: string;
  dataApresentacao?: string;
}

export interface Votacao {
  id: string;
  dataHoraRegistro: string;
  siglaOrgao: string;
  voto: string;
  proposicao: {
    siglaTipo: string;
    numero: number;
    ano: number;
    ementa: string;
  } | null;
  titulo: string;
}

export interface Ocupacao {
  titulo: string;
  entidade: string;
  anoInicio: number;
  anoFim: number | null;
}

export interface Orgao {
  idOrgao: number;
  siglaOrgao: string;
  nomeOrgao: string;
  titulo: string; // Cargo (ex: Membro, Suplente)
}

export const fetchDeputados = async (page: number = 1, itens: number = 30): Promise<Deputado[]> => {
  const response = await fetch(
    `/api/camara/deputados?pagina=${page}&itens=${itens}&ordem=ASC&ordenarPor=nome`
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.dados;
};

export const searchDeputados = async (nome: string): Promise<Deputado[]> => {
  const response = await fetch(
    `/api/camara/deputados?nome=${nome}&ordem=ASC&ordenarPor=nome`
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.dados;
};

export const fetchDeputadoDetalhes = async (id: number) => {
  const response = await fetch(`/api/camara/deputados/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch details (HTTP ${response.status})`);
  }
  const data = await response.json();
  return data.dados;
};

// Expanded types as requested by the user
export const fetchProposicoes = async (idDeputado: number) => {
  const params = new URLSearchParams({
    idDeputadoAutor: idDeputado.toString(),
    ordem: 'DESC',
    ordenarPor: 'id',
    itens: '100'
  });
  const url = `/api/camara/proposicoes?${params.toString()}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch proposições (HTTP ${response.status})`);
  }
  const data = await response.json();
  return data.dados as Proposicao[];
};

export const fetchProposicaoDetalhes = async (id: number) => {
  const response = await fetch(`/api/camara/proposicoes/${id}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.dados;
};

export const fetchVotacoesNominais = async (idDeputado: number) => {
  // Using the specific endpoint for deputy's votes as per the new guidelines
  const url = `/api/camara/deputados/${idDeputado}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch votacoes (HTTP ${response.status})`);
  }
  const data = await response.json();
  
  return data.dados.map((v: any) => ({
    id: String(v.id),
    dataHoraRegistro: v.dataHoraRegistro,
    siglaOrgao: v.siglaOrgao,
    voto: v.voto || 'N/A', 
    proposicao: v.proposicao ? {
      siglaTipo: v.proposicao.siglaTipo,
      numero: v.proposicao.numero,
      ano: v.proposicao.ano,
      ementa: v.proposicao.ementa || v.titulo || 'Sem ementa'
    } : null,
    titulo: v.titulo || 'Votação Legislativa'
  })) as Votacao[];
};

export const fetchVotoEmVotacao = async (idVotacao: string, idDeputado: number): Promise<string> => {
  try {
    const url = `/api/camara/votacoes/${idVotacao}/votos?idDeputado=${idDeputado}`;
    const response = await fetch(url);
    if (!response.ok) return 'N/A';
    const data = await response.json();
    if (data.dados && data.dados.length > 0) {
      return data.dados[0].voto || 'Abstenção';
    }
    return 'Art. 17';
  } catch (err) {
    console.error("Fetch Vote Error:", err);
    return 'Erro';
  }
};

export const fetchOcupacoes = async (idDeputado: number) => {
  const response = await fetch(`/api/camara/deputados/${idDeputado}/ocupacoes`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.dados as Ocupacao[];
};

export const fetchOrgaos = async (idDeputado: number) => {
  const response = await fetch(`/api/camara/deputados/${idDeputado}/orgaos`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.dados as Orgao[];
};
