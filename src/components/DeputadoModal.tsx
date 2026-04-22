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
import { fetchSenadorProposicoes, fetchSenadorVotacoes, fetchSenadorHistorico } from '../services/senado';
import { explicarProposicao, Explanacao, comoIssoMeAfeta, explicarVoto } from '../services/ai';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { X, FileText, MessageSquare, Briefcase, AlertTriangle, Users, Building, Vote, History, ShieldAlert, Award, Search, Filter, UserCheck, ChevronDown, Check, Coins, Zap, Landmark } from 'lucide-react';

import { AudioButton } from './AudioButton';

interface Props {
  deputado: Deputado;
  onClose: () => void;
  casa: 'camara' | 'senado';
}

const ProposicaoCard = ({ prop, key }: { prop: Proposicao, key?: any }) => {
  const [explanacao, setExplanacao] = useState<Explanacao | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [perfil, setPerfil] = useState<"CLT" | "MEI" | "empresario" | "aposentado" | null>(null);
  const [perfilAna, setPerfilAna] = useState<string | null>(null);
  const [anaLoading, setAnaLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await explicarProposicao(prop.ementa, prop.siglaTipo, prop.numero, prop.ano);
        setExplanacao(res);
      } catch (err) {
        console.error("AI Error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [prop]);

  const handleAnalisePerfil = async (p: any) => {
    setPerfil(p);
    setAnaLoading(true);
    const res = await comoIssoMeAfeta(prop.ementa, p);
    setPerfilAna(res);
    setAnaLoading(false);
  };

  if (loading) return (
    <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5 animate-pulse mb-4 h-48" />
  );

  if (!explanacao) return (
    <div className="group relative pl-8 pb-12 last:pb-0">
      <div className="absolute left-0 top-0 bottom-0 w-px bg-white/5" />
      <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full border border-black bg-neutral-800" />
      <div className="flex flex-col gap-4">
        <span className="text-[10px] font-black bg-white/5 border border-white/10 px-2 py-1 rounded text-neutral-500 uppercase tracking-widest w-fit">
          {prop.siglaTipo} {prop.numero}/{prop.ano}
        </span>
        <h3 className="text-lg font-bold text-white tracking-tight leading-tight">
          {prop.ementa}
        </h3>
        <p className="text-xs text-neutral-600 italic">Análise de IA indisponível para este item.</p>
      </div>
    </div>
  );

  return (
    <div className="group relative pl-8 pb-12 last:pb-0">
      <div className="absolute left-0 top-0 bottom-0 w-px bg-white/5 group-last:bg-transparent" />
      <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full border border-black bg-neutral-800" />

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black bg-white/5 border border-white/10 px-2 py-1 rounded text-neutral-500 uppercase tracking-widest whitespace-nowrap">
            {explanacao.tipo} {explanacao.numero}
          </span>
          <div className="flex gap-1">
              {explanacao.impactos.salario && <Coins size={12} className="text-emerald-500" />}
              {explanacao.impactos.impostos && <FileText size={12} className="text-rose-500" />}
              {explanacao.impactos.beneficios && <Award size={12} className="text-brand-accent" />}
          </div>
        </div>

        <h3 className="text-lg font-bold text-white tracking-tight leading-tight transition-colors">
          {explanacao.titulo}
        </h3>

        <p className="text-sm text-neutral-400 font-medium leading-relaxed max-w-2xl">
          {explanacao.resumo_simples}
        </p>

        <div className="flex flex-wrap gap-2">
          {explanacao.tags.slice(0, 4).map(t => (
            <span key={t} className="text-[9px] font-bold text-neutral-600 bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">
              {t}
            </span>
          ))}
        </div>

        <button 
          onClick={() => setShowDetail(!showDetail)}
          className="text-[10px] font-black text-brand-accent hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2 w-fit"
        >
          {showDetail ? 'Menos Detalhes' : 'Análise Completa'}
          <ChevronDown size={14} className={`transition-transform ${showDetail ? 'rotate-180' : ''}`} />
        </button>

        {showDetail && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 pt-4 border-t border-white/5 mt-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Público Afetado</h4>
                <p className="text-xs text-white font-bold">{explanacao.quem_afeta.join(', ')}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Resultado Prático</h4>
                <p className="text-xs text-white font-bold">{explanacao.impacto_resumido}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const VotacaoItem = ({ vote }: { vote: Votacao; deputadoId: number }) => {
  const [explanacao, setExplanacao] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      // Small optimization: only explain if we have some text
      if (!vote.proposicao && !vote.titulo) return;
      
      setLoading(true);
      try {
        const res = await explicarVoto(vote.voto, vote.titulo, vote.proposicao?.ementa || '');
        setExplanacao(res);
      } catch (err) {
        console.error("Voto AI Error:", err);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [vote]);

  const getVoteColor = (v: string) => {
    const vd = v.toLowerCase();
    if (vd.includes('sim')) return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5';
    if (vd.includes('não')) return 'text-rose-500 border-rose-500/20 bg-rose-500/5';
    return 'text-neutral-400 border-neutral-500/20 bg-neutral-500/5';
  };

  return (
    <div className="relative pl-8 pb-10 group last:pb-0">
      {/* Timeline Line */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-white/5" />
      <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full border border-black bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]" />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-black bg-white/5 border border-white/10 px-2 py-1 rounded text-neutral-500 uppercase tracking-widest">
             {vote.proposicao?.siglaTipo || 'VOT'}
          </span>
          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-tighter">
            {new Date(vote.dataHoraRegistro).toLocaleDateString()} • {vote.siglaOrgao}
          </span>
        </div>

        <div className="flex justify-between items-start gap-4">
          <h4 className="text-base font-bold text-white tracking-tight leading-snug max-w-xl">
            {vote.titulo}
          </h4>
          <span className={`shrink-0 px-4 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-widest ${getVoteColor(vote.voto)}`}>
            {vote.voto.toUpperCase()}
          </span>
        </div>

        <div className="relative">
          {loading ? (
             <div className="flex items-center gap-2 py-2">
                <div className="w-3 h-3 border border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
                <span className="text-[10px] font-black text-neutral-700 uppercase tracking-widest animate-pulse">Consultando impacto...</span>
             </div>
          ) : explanacao ? (
            <p className="text-sm text-neutral-400 font-medium leading-relaxed max-w-2xl line-clamp-2 hover:line-clamp-none transition-all cursor-default">
              {explanacao.replace(/👉/g, '').trim()}
            </p>
          ) : (
            <p className="text-xs text-neutral-600 italic">Contexto legislativo não detalhado.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const DeputadoModal = ({ deputado, onClose, casa }: Props) => {
  const [tab, setTab] = useState<'VOTACOES' | 'PROPOSICOES' | 'CARREIRA'>('VOTACOES');
  const [propItems, setPropItems] = useState<Proposicao[]>([]);
  const [voteItems, setVoteItems] = useState<Votacao[]>([]);
  const [careerItems, setCareerItems] = useState<Ocupacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilterType, setActiveFilterType] = useState("ALL");
  const [impactFilter, setImpactFilter] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (casa === 'camara') {
          const [resProps, resVotes, resCareer] = await Promise.all([
            fetchProposicoes(deputado.id),
            fetchVotacoesNominais(deputado.id),
            fetchOcupacoes(deputado.id)
          ]);
          setPropItems(resProps || []);
          setVoteItems(resVotes || []);
          setCareerItems(resCareer || []);
        } else {
          // Senate logic
          const [resProps, resVotes, resHist] = await Promise.all([
            fetchSenadorProposicoes(deputado.id.toString()),
            fetchSenadorVotacoes(deputado.id.toString()),
            fetchSenadorHistorico(deputado.id.toString())
          ]);
          setPropItems(resProps || []);
          setVoteItems(resVotes || []);
          setCareerItems(resHist || []); 
        }
      } catch (err) {
        console.error("Modal Data Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [deputado.id, casa]);

  const filteredProps = propItems.filter(p => {
    const matchesSearch = (p.ementa || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = activeFilterType === "ALL" || p.siglaTipo === activeFilterType;
    return matchesSearch && matchesType;
  });

  const filteredVotes = voteItems.filter(v => {
    const matchesSearch = 
      (v.titulo || "").toLowerCase().includes(search.toLowerCase()) || 
      (v.proposicao?.ementa || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={onClose} />
      
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-4xl h-[92vh] sm:h-[90vh] bg-neutral-950 rounded-[48px] overflow-hidden flex flex-col border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)]">
        
        {/* Elite Header */}
        <div className="p-10 pb-0 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex gap-10 items-center">
             <div className="w-28 h-28 rounded-full bg-neutral-900 border border-white/5 overflow-hidden relative shadow-2xl shrink-0">
                <img src={deputado.urlFoto} alt={deputado.nome} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
             </div>
             <div>
                <div className="flex items-center gap-3 mb-3">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                   <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em]">
                     Paramentar em Exercício • {casa === 'camara' ? 'Câmara' : 'Senado'}
                   </span>
                </div>
                <h2 className="text-5xl font-black text-white tracking-tighter leading-none mb-4">{deputado.nome}</h2>
                <div className="flex items-center gap-6">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Partido / UF</span>
                      <span className="text-sm font-bold text-white uppercase">{deputado.siglaPartido} — {deputado.siglaUf}</span>
                   </div>
                   <div className="w-px h-8 bg-white/5" />
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Identificação</span>
                      <span className="text-sm font-bold text-white uppercase">ID {deputado.id}</span>
                   </div>
                </div>
             </div>
          </div>
          <div className="flex gap-4">
            <AudioButton 
              deputadoId={deputado.id} 
              nome={deputado.nome}
              partido={deputado.siglaPartido}
              siglaUf={deputado.siglaUf}
            />
            <button onClick={onClose} className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-neutral-500 hover:text-white transition-all hover:bg-white/10">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Global Tabs */}
        <div className="px-10 mt-12 flex gap-8 border-b border-white/5 overflow-x-auto no-scrollbar">
           {[ { id: 'VOTACOES', icon: Vote, label: 'Timeline de Votos' }, { id: 'PROPOSICOES', icon: FileText, label: 'Atividade Legislativa' }, { id: 'CARREIRA', icon: History, label: 'Histórico' }].map(t => (
             <button
               key={t.id}
               onClick={() => setTab(t.id as any)}
               className={`flex items-center gap-2 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative
                 ${tab === t.id ? 'text-white' : 'text-neutral-600 hover:text-neutral-400'}`}
             >
               {t.label}
               {tab === t.id && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white shadow-[0_0_20px_white]" />}
             </button>
           ))}
        </div>

        {/* Search for any active tab that has lists */}
        {(tab === 'PROPOSICOES' || tab === 'VOTACOES') && (
          <div className="px-10 py-6 bg-black/20 flex flex-col gap-6 border-b border-white/5">
             <div className="relative flex-1 w-full">
               <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-neutral-700" size={14} />
               <input 
                 type="text" 
                 placeholder="Filtrar por tema, lei ou palavra-chave..."
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full bg-transparent border-none py-2 pl-6 pr-6 text-xs text-white focus:outline-none placeholder:text-neutral-700 font-bold uppercase tracking-widest transition-all"
               />
             </div>
             
             {tab === 'PROPOSICOES' && (
               <div className="flex flex-wrap gap-2">
                 {['ALL', 'PL', 'PEC', 'PLP', 'MPV'].map(type => (
                   <button
                     key={type}
                     onClick={() => setActiveFilterType(type)}
                     className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all border
                       ${activeFilterType === type 
                         ? 'bg-white text-black border-white' 
                         : 'text-neutral-600 border-white/5 hover:border-white/10'}`}
                   >
                     {type === 'ALL' ? 'Todos' : type}
                   </button>
                 ))}
               </div>
             )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 scroll-area">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="w-16 h-16 border-4 border-brand-accent/10 border-t-brand-accent rounded-full animate-spin" />
                <p className="text-[11px] font-black text-neutral-600 uppercase tracking-[0.4em] animate-pulse">Auditando Histórico Legislativo...</p>
             </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {tab === 'PROPOSICOES' && (
                filteredProps.length > 0 ? filteredProps.map(p => <ProposicaoCard key={p.id} prop={p} />) : (
                  <div className="text-center py-20 bg-white/[0.01] rounded-[48px] border border-dashed border-white/5">
                    <AlertTriangle size={48} className="text-neutral-800 mx-auto mb-6" />
                    <p className="text-neutral-600 text-xs font-black uppercase tracking-widest italic">Nenhum projeto encontrado com os filtros atuais.</p>
                  </div>
                )
              )}
              {tab === 'VOTACOES' && (
                filteredVotes.length > 0 ? filteredVotes.map((v, i) => (
                  <VotacaoItem key={`${v.id}-${i}`} vote={v} deputadoId={deputado.id} />
                )) : (
                  <div className="text-center py-20 bg-white/[0.01] rounded-[48px] border border-dashed border-white/5">
                    <Vote size={48} className="text-neutral-800 mx-auto mb-6" />
                    <p className="text-neutral-600 text-xs font-black uppercase tracking-widest italic">Nenhuma votação nominal recente encontrada.</p>
                  </div>
                )
              )}
              {tab === 'CARREIRA' && (
                careerItems.map((c, i) => (
                  <div key={i} className="flex gap-8 mb-10 group">
                    <div className="flex flex-col items-center gap-2">
                       <div className="w-4 h-4 rounded-full border-2 border-brand-accent bg-black group-hover:scale-125 transition-transform" />
                       <div className="w-px flex-1 bg-white/10 group-last:hidden" />
                    </div>
                    <div className="pb-8">
                       <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest mb-2">{c.anoInicio} {c.anoFim ? `— ${c.anoFim}` : '• Atual'}</p>
                       <h4 className="text-xl font-bold text-white tracking-tight">{c.titulo}</h4>
                       <p className="text-neutral-500 text-xs uppercase font-black mt-1 tracking-tighter">{c.entidade}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Global Footer */}
        <div className="p-8 border-t border-white/10 bg-black flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
                <AudioButton 
                  deputadoId={deputado.id} 
                  nome={deputado.nome}
                  partido={deputado.siglaPartido}
                  siglaUf={deputado.siglaUf}
                />
                <div className="hidden sm:flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-brand-accent/20 flex items-center justify-center text-brand-accent">
                     <ShieldAlert size={20} />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-white uppercase tracking-widest">Elite de Transparência</p>
                     <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-tighter">Gemini + ElevenLabs AI</p>
                   </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
               <p className="text-[10px] font-bold text-neutral-800 uppercase tracking-widest">FISCALIZA BRASIL 2026</p>
               <button className="p-4 rounded-[20px] bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all">
                  <Briefcase size={16} />
               </button>
            </div>
        </div>
      </motion.div>
    </div>
  );
};
