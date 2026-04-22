/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Deputado, 
  fetchProposicoes, 
  Proposicao, 
  Votacao, 
  fetchVotacoesNominais, 
  Ocupacao, 
  fetchOcupacoes, 
  Orgao, 
  fetchOrgaos,
  fetchVotoEmVotacao 
} from '../services/camara';
import { explicarProposicao, Explanacao, explicarVoto } from '../services/ai';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, MessageSquare, Briefcase, AlertTriangle, Users, Building, ChevronRight, Info, Vote, History, MapPin, ShieldAlert, Award } from 'lucide-react';

interface Props {
  deputado: Deputado;
  onClose: () => void;
}

const VotacaoItem = ({ vote, deputadoId }: { vote: Votacao; deputadoId: number; key?: any }) => {
  const [explanacao, setExplanacao] = useState<Explanacao | null>(null);
  const [realVote, setRealVote] = useState(vote.voto);
  const [loading, setLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        // Se o voto ainda não foi carregado (está como '...'), buscamos agora
        let finalVote = vote.voto;
        if (vote.voto === '...') {
          finalVote = await fetchVotoEmVotacao(vote.id, deputadoId);
          setRealVote(finalVote);
        }
        
        const res = await explicarVoto(finalVote, vote.titulo, vote.proposicao?.ementa || '');
        setExplanacao(res);
      } catch (err) {
        console.error("Voto AI Error:", err);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [vote, deputadoId]);

  return (
    <div className={`p-6 rounded-3xl mb-4 bg-white/[0.03] border border-white/[0.05] transition-all
      ${explanacao?.beneficiaPovo ? 'border-l-4 border-l-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.02)]' : 'border-l-4 border-l-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.02)]'}`}>
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full
              ${realVote === 'Sim' ? 'bg-emerald-500 text-black' : realVote === '...' ? 'bg-neutral-800 text-neutral-500 animate-pulse' : 'bg-rose-500 text-black'}`}>
              Votou {realVote.toUpperCase()}
            </span>
            {explanacao?.critico && (
              <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-white text-black px-2.5 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle size={10} /> Voto Crítico
              </span>
            )}
            <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">{new Date(vote.dataHoraRegistro).toLocaleDateString()}</span>
          </div>
          <h4 className="font-bold text-sm text-white tracking-tight leading-tight">
             {loading ? 'Analisando impacto do voto...' : explanacao?.tituloAmigavel || vote.titulo}
          </h4>
        </div>
        <div className="text-right">
             <span className={`text-[9px] font-black uppercase tracking-widest
              ${explanacao?.beneficiaPovo ? 'text-emerald-400' : 'text-rose-400'}`}>
              {explanacao?.beneficiaPovo ? '🟢 Pró-Povo' : '🔴 Pró-Elite'}
            </span>
        </div>
      </div>

      <p className="text-neutral-400 text-xs leading-relaxed mb-4">
        {explanacao?.explicacao || 'Processando análise simplificada...'}
      </p>

      <div className="flex justify-between items-center pt-4 border-t border-white/5">
        <div className="text-[9px] text-neutral-600 font-bold uppercase tracking-tight flex items-center gap-2">
          <Building size={10} /> Local: {vote.siglaOrgao}
        </div>
        <button 
          onClick={() => setShowOriginal(!showOriginal)}
          className="text-[9px] text-neutral-700 hover:text-white transition-colors"
        >
          Ver Metadados
        </button>
      </div>

      {showOriginal && (
        <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 font-mono text-[9px] text-neutral-500">
           {vote.titulo}
        </div>
      )}
    </div>
  );
};

const CarreiraItem = ({ item }: { item: Ocupacao; key?: any }) => (
  <div className="p-5 rounded-3xl mb-3 bg-white/[0.02] border border-white/[0.05] flex items-center gap-4">
    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-400 shrink-0">
      <Briefcase size={20} />
    </div>
    <div className="flex-1">
      <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-0.5">
        {item.anoInicio} {item.anoFim ? `- ${item.anoFim}` : '— Atualmente'}
      </p>
      <h4 className="text-white text-sm font-bold tracking-tight">{item.titulo}</h4>
      <p className="text-neutral-400 text-[10px] leading-tight font-medium uppercase tracking-tighter mt-1">{item.entidade}</p>
    </div>
  </div>
);

const ComissaoItem = ({ item }: { item: Orgao; key?: any }) => (
  <div className="p-5 rounded-3xl mb-3 bg-white/[0.02] border border-white/[0.05] flex items-center gap-4">
    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-400 shrink-0">
      <Building size={20} />
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-black bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded-full uppercase tracking-widest">
           {item.siglaOrgao}
        </span>
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Cargo: {item.titulo}</span>
      </div>
      <h4 className="text-white text-xs font-bold leading-tight">{item.nomeOrgao}</h4>
    </div>
  </div>
);

const ProposicaoItem = ({ prop }: { prop: Proposicao; key?: any }) => {
  const [explanacao, setExplanacao] = useState<Explanacao | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await explicarProposicao(prop.ementa, prop.siglaTipo, prop.numero, prop.ano);
        setExplanacao(res);
      } catch (err) {
        console.error("AI Error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [prop]);

  if (loading) {
    return (
      <div className="p-6 border border-white/5 rounded-3xl bg-white/[0.03] animate-pulse mb-4">
        <div className="h-4 bg-white/10 rounded-full w-3/4 mb-3"></div>
        <div className="h-2.5 bg-white/5 rounded-full w-1/2"></div>
      </div>
    );
  }

  if (error || !explanacao) {
    return (
      <div className="p-6 border border-rose-500/20 rounded-3xl bg-rose-500/5 mb-4">
        <p className="text-[9px] text-rose-400 font-black uppercase mb-2 flex items-center gap-2 tracking-widest">
          <AlertTriangle size={12} /> Falha na Tradução IA
        </p>
        <p className="text-[11px] text-neutral-400 mb-3 italic leading-relaxed">"{prop.ementa.substring(0, 120)}..."</p>
        <button 
          onClick={() => setShowOriginal(!showOriginal)}
          className="text-[9px] text-neutral-600 hover:text-white transition-colors underline font-bold"
        >
          {showOriginal ? 'Ocultar original' : '📄 Ver texto técnico original'}
        </button>
        {showOriginal && (
          <p className="text-[10px] text-neutral-500 mt-4 font-mono p-4 bg-black/40 rounded-2xl border border-white/5">{prop.ementa}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-3xl mb-4 bg-white/[0.03] border border-white/[0.05] transition-all hover:bg-white/[0.05]
      ${explanacao.beneficiaPovo ? 'hover:border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.03)]' : 'hover:border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.03)]'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
             <span className="text-[8px] font-black bg-white/5 text-neutral-400 px-2.5 py-1 rounded-full uppercase tracking-widest">
               {prop.siglaTipo} {prop.numero}/{prop.ano}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full
              ${explanacao.beneficiaPovo ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
              {explanacao.beneficiaPovo ? 'Impacto Social' : 'Impacto Restrito'}
            </span>
            {explanacao.critico && (
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] bg-white text-black px-2.5 py-1 rounded-full">
                🔥 Crítico
              </span>
            )}
          </div>
          <h4 className="font-bold text-base text-white tracking-tight leading-tight">
            {explanacao.tituloAmigavel}
          </h4>
        </div>
        <div className="text-right">
           <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest block mb-1">Impacto</span>
           <span className={`text-[10px] font-bold uppercase tracking-widest
            ${explanacao.impacto === 'alto' ? 'text-rose-500' : 
              explanacao.impacto === 'medio' ? 'text-amber-500' : 'text-emerald-500'}`}>
            {explanacao.impacto}
          </span>
        </div>
      </div>

      <p className="text-neutral-400 text-xs leading-relaxed mb-6 font-medium tracking-wide">
        {explanacao.explicacao}
      </p>

      <div className="flex justify-between items-center pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-tight">
          <Users size={12} className="opacity-50" />
          <span>Foco Principal: <span className="text-neutral-300">{explanacao.paraQuemE}</span></span>
        </div>
        <button 
          onClick={() => setShowOriginal(!showOriginal)}
          className="text-[10px] font-bold text-neutral-700 hover:text-white transition-colors"
        >
          {showOriginal ? 'Sair do Modo Técnico' : 'Visualizar Ementa Original'}
        </button>
      </div>
        
      {showOriginal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 p-4 bg-black/40 rounded-2xl border border-white/5"
        >
          <p className="text-[10px] text-neutral-500 leading-relaxed font-mono">{prop.ementa}</p>
        </motion.div>
      )}
    </div>
  );
};

export const DeputadoModal = ({ deputado, onClose }: Props) => {
  const [tab, setTab] = useState<'PROPOSICOES' | 'VOTACOES' | 'CARREIRA' | 'COMISSOES'>('PROPOSICOES');
  const [propItems, setPropItems] = useState<Proposicao[]>([]);
  const [voteItems, setVoteItems] = useState<Votacao[]>([]);
  const [careerItems, setCareerItems] = useState<Ocupacao[]>([]);
  const [orgItems, setOrgItems] = useState<Orgao[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [detalhes, setDetalhes] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const [resProps, resVotes, resCareer, resOrgs, resDetalhes] = await Promise.all([
          fetchProposicoes(deputado.id, ['PL', 'PEC', 'PDL', 'PRC', 'PLP', 'MPV', 'MSC', 'REP', 'RIC', 'REQ']),
          fetchVotacoesNominais(deputado.id),
          fetchOcupacoes(deputado.id),
          fetchOrgaos(deputado.id),
          fetch(`/api/camara/deputados/${deputado.id}`).then(r => r.json()).then(d => d.dados)
        ]);
        
        setPropItems(resProps);
        setVoteItems(resVotes);
        setCareerItems(resCareer);
        setOrgItems(resOrgs);
        setDetalhes(resDetalhes);
      } catch (err) {
        console.error("Modal Data Load Error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [deputado.id]);

  const getClassificacao = () => {
    const oposiçãoPartidos = ['PT', 'PSOL', 'PCdoB', 'PV', 'REDE'];
    const centrãoPartidos = ['PP', 'PL', 'REPUBLICANOS', 'MDB', 'PSD', 'UNIÃO'];
    if (oposiçãoPartidos.includes(deputado.siglaPartido)) return { label: 'Base do Governo', color: 'text-emerald-400' };
    if (centrãoPartidos.includes(deputado.siglaPartido)) return { label: 'Centrão', color: 'text-amber-400' };
    return { label: 'Oposição', color: 'text-rose-400' };
  };

  const classificacao = getClassificacao();
  const situacao = detalhes?.ultimoStatus?.situacao || 'Mandato Ativo';
  const isAmeacado = situacao.toLowerCase().includes('cassado') || situacao.toLowerCase().includes('processo');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-3xl"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 10 }}
        className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] gloss rounded-[40px] overflow-hidden flex flex-col shadow-2xl border-white/10"
      >
        {/* Header Section */}
        <div className="p-6 sm:p-10 pb-6 flex items-start justify-between border-b border-white/5">
          <div className="flex gap-6 sm:gap-8 items-center">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-[32px] bg-neutral-950 border border-white/10 overflow-hidden shadow-2xl relative shrink-0">
              <img 
                src={deputado.urlFoto} 
                alt={deputado.nome} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {isAmeacado && (
                <div className="absolute top-2 right-2 p-1 bg-rose-500 rounded-lg shadow-lg">
                  <ShieldAlert size={12} className="text-white" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">Registro Federal 56ª Legislatura</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tighter leading-none mb-3">{deputado.nome}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                   <Award size={14} className="text-brand-accent opacity-50" />
                   <span className="text-xs font-black text-neutral-300 uppercase tracking-tighter">{deputado.siglaPartido} • {deputado.siglaUf}</span>
                </div>
                <div className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                <span className={`text-[10px] font-black uppercase tracking-widest ${classificacao.color} bg-black/40 px-3 py-1 rounded-full border border-white/5`}>
                  {classificacao.label}
                </span>
                {detalhes?.ultimoStatus?.condicaoEleitoral === 'Titular' ? (
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-400/20 px-3 py-1 rounded-full">Titular</span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 border border-amber-400/20 px-3 py-1 rounded-full">Licenciado / Suplente</span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full apple-button flex items-center justify-center text-neutral-500 hover:text-white transition-all shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 sm:px-10 mt-6 flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {[
              { id: 'PROPOSICOES', icon: FileText, label: 'Criações' },
              { id: 'VOTACOES', icon: Vote, label: 'Votações' },
              { id: 'COMISSOES', icon: Building, label: 'Comissões' },
              { id: 'CARREIRA', icon: History, label: 'Trajetória' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border
                  ${tab === t.id ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-neutral-500 apple-button border-transparent'}`}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            ))}
        </div>

        {/* Scrolling Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 pt-6 scroll-area">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-6">
              <div className="w-12 h-12 border-2 border-white/5 border-t-white rounded-full animate-spin" />
              <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Cruzando Dados Governamentais...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
               <AlertTriangle size={40} className="text-rose-500 mx-auto mb-4 opacity-50" />
               <p className="text-neutral-400 text-sm font-bold uppercase tracking-widest leading-loose">Erro ao sincronizar informações.<br/>Tente novamente em alguns segundos.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tab === 'PROPOSICOES' && (
                <>
                  <div className="mb-8 p-6 rounded-3xl bg-neutral-950 border border-white/5">
                    <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Info size={14} /> Status Digital do Mandato
                    </p>
                    <p className="text-sm text-neutral-300 font-medium leading-relaxed">
                      Atualmente: <b className="text-white">{situacao}</b>.
                      Acompanhamos todos os projetos e requerimentos apresentados por este deputado no Plenário.
                    </p>
                  </div>
                  {propItems.length > 0 ? propItems.map(p => <ProposicaoItem key={p.id} prop={p} />) : (
                    <p className="text-center py-10 text-neutral-600 text-xs font-bold uppercase tracking-widest">Sem proposições recentes registradas.</p>
                  )}
                </>
              )}
              {tab === 'VOTACOES' && (
                 <>
                  <div className="mb-8 p-6 rounded-3xl bg-neutral-950 border border-white/5">
                    <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Vote size={14} /> Registro de Votos Nominais
                    </p>
                    <p className="text-sm text-neutral-300 font-medium leading-relaxed">
                      Transparência de voto: Cada SIM ou NÃO é analisado pela nossa IA para traduzir o impacto real na sua vida.
                    </p>
                  </div>
                  {voteItems.length > 0 ? voteItems.map((v, i) => (
                    <VotacaoItem key={`${v.id}-${i}`} vote={v} deputadoId={deputado.id} />
                  )) : (
                    <p className="text-center py-10 text-neutral-600 text-xs font-bold uppercase tracking-widest">Sem registros de votação nominal nesta legislatura.</p>
                  )}
                 </>
              )}
              {tab === 'CARREIRA' && (
                <>
                   <div className="mb-8 p-1">
                      <h3 className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em] mb-6">Linha do Tempo Profissional</h3>
                      {careerItems.length > 0 ? careerItems.map((c, i) => <CarreiraItem key={i} item={c} />) : (
                        <p className="text-left py-4 text-neutral-600 text-[10px] font-bold uppercase tracking-widest leading-loose italic">
                          O arquivo histórico detalhado deste parlamentar ainda está sendo digitalizado pelo banco central de dados.
                        </p>
                      )}
                   </div>
                </>
              )}
              {tab === 'COMISSOES' && (
                <>
                  <div className="mb-8 p-1">
                    <h3 className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em] mb-6">Atuação em Órgãos Legislativos</h3>
                    {orgItems.length > 0 ? orgItems.map((o, i) => <ComissaoItem key={i} item={o} />) : (
                      <p className="text-left py-4 text-neutral-600 text-xs uppercase tracking-widest">Sem comissões ativas no momento.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 border-t border-white/5 bg-black/40 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 text-[10px] text-neutral-600 font-black uppercase tracking-tighter">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
              <div className="w-1 h-1 bg-emerald-500 rounded-full" />
              Portal Dados Abertos
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
              <div className="w-1 h-1 bg-brand-accent rounded-full" />
              IA Fiscaliza Analista
            </div>
          </div>
          <div className="text-[10px] font-bold text-neutral-700 italic">
             Este dossiê é gerado em tempo real e pode conter inconsistências de rede.
          </div>
        </div>
      </motion.div>
    </div>
  );
};
