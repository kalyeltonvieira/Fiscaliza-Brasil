/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Deputado, fetchDeputados, searchDeputados } from './services/camara';
import { DeputadoCard } from './components/DeputadoCard';
import { DeputadoModal } from './components/DeputadoModal';
import { Search, Info, LayoutGrid, Eye, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [deputados, setDeputados] = useState<Deputado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeputado, setSelectedDeputado] = useState<Deputado | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && searchTerm === '') {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, searchTerm]);

  // Initial load and infinite scroll
  useEffect(() => {
    const load = async () => {
      if (searchTerm !== '') return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDeputados(page);
        if (data.length === 0) setHasMore(false);
        setDeputados(prev => page === 1 ? data : [...prev, ...data]);
      } catch (err: any) {
        console.error(err);
        setError(`Erro de conexão. Tente novamente.`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, searchTerm]);

  // Search logic
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchTerm === '') {
        setError(null);
        setPage(1); 
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await searchDeputados(searchTerm);
        setDeputados(data);
        setHasMore(false);
      } catch (err: any) {
        console.error(err);
        setError(`Erro na busca: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/10">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-2xl border-b border-white/5 px-6 h-16 flex items-center">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-8">
          <div className="flex items-center gap-6 shrink-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shadow-lg shadow-white/10 group-hover:scale-105 transition-transform">
                <Eye size={18} />
              </div>
              <h1 className="text-sm font-bold tracking-[0.2em] uppercase hidden sm:block">
                Fiscaliza<span className="text-neutral-500 italic">Brasil</span>
              </h1>
            </motion.div>
          </div>

          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={14} />
              <input
                type="text"
                placeholder="Buscar por nome, partido ou região..."
                className="w-full bg-neutral-900 border-none rounded-full py-2 pl-12 pr-4 text-xs font-medium focus:ring-1 focus:ring-white/10 transition-all placeholder:text-neutral-600 backdrop-blur-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 select-none">
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-white">Live</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-16 text-center sm:text-left">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6"
          >
            Vigilância <span className="text-neutral-500 font-normal">Contínua.</span>
          </motion.h2>
          <p className="text-neutral-500 text-sm max-w-md leading-relaxed">
            Monitoramento oficial de 513 deputados federais. 
            Informação bruta, filtrada por tecnologia e transparência.
          </p>
        </div>

        {error && (
          <div className="mb-10 p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-rose-400">
              <AlertTriangle size={20} />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest leading-none mb-1">Status de Erro</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="shrink-0 text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white text-white hover:text-black px-6 py-3 rounded-full transition-all"
            >
              Recarregar
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
          {deputados.map((dep, index) => (
                <DeputadoCard 
                  key={`${dep.id}-${index}`} 
                  deputado={dep as Deputado} 
                  onClick={(d: Deputado) => setSelectedDeputado(d)} 
                />
          ))}
          
          {hasMore && searchTerm === '' && (
            <div ref={lastElementRef} className="col-span-full py-20 flex items-center justify-center">
              <div className="w-5 h-5 border border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {!loading && deputados.length === 0 && !error && (
          <div className="py-40 text-center">
            <p className="text-neutral-500 text-sm">Nenhum resultado nos arquivos.</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {selectedDeputado && (
          <DeputadoModal 
            deputado={selectedDeputado} 
            onClose={() => setSelectedDeputado(null)} 
          />
        )}
      </AnimatePresence>

      <footer className="py-20 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="max-w-sm text-center md:text-left">
             <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
                <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-white">
                  <Eye size={10} />
                </div>
                <h3 className="text-[10px] font-black tracking-widest uppercase">Fiscaliza Brasil</h3>
             </div>
             <p className="text-neutral-600 text-[10px] leading-relaxed uppercase tracking-tighter">
               Dados oficiais • Câmara dos Deputados • AI Analysis • Transparência Radical
             </p>
          </div>
          <div className="flex items-center gap-8 grayscale brightness-50 opacity-40">
             <img src="https://dadosabertos.camara.leg.br/static/img/logo-camara.png" alt="Câmara" className="h-8" />
          </div>
        </div>
      </footer>
    </div>
  );
}
