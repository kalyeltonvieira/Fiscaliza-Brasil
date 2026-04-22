import { useState, useRef } from 'react';
import { Volume2, Loader2, Play, RotateCcw, AlertCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateAudioScript } from '../services/ai';

interface AudioButtonProps {
  deputadoId: number;
  nome: string;
  partido: string;
  siglaUf: string;
}

export const AudioButton = ({ deputadoId, nome, partido, siglaUf }: AudioButtonProps) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerateAudio = async () => {
    if (audioUrl) {
      playAudio();
      return;
    }

    setStatus('loading');
    try {
      // 1. Tentar buscar do cache no backend
      let response = await fetch(`/api/deputados/${deputadoId}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      let data = await response.json();

      // 2. Se não tiver cache, gerar roteiro no frontend e enviar
      if (data.needsScript) {
        const script = await generateAudioScript(
          nome, 
          partido, 
          ["Política Nacional", siglaUf], 
          "Vota geralmente acompanhando as diretrizes do seu partido."
        );

        response = await fetch(`/api/deputados/${deputadoId}/audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script })
        });
        
        data = await response.json();
      }

      if (!data.audioUrl) throw new Error('Falha ao gerar URL');
      
      setAudioUrl(data.audioUrl);
      setStatus('playing');
      
      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;
      audio.onended = () => setStatus('idle');
      audio.play();
    } catch (err) {
      console.error(err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      setStatus('playing');
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  const stopAudio = () => {
      if (audioRef.current) {
          audioRef.current.pause();
          setStatus('idle');
      }
  };

  return (
    <div className="flex items-center gap-3">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={status === 'playing' ? stopAudio : handleGenerateAudio}
        disabled={status === 'loading'}
        className={`relative flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all border
          ${status === 'loading' ? 'bg-neutral-900 text-neutral-600 border-white/5' : 
            status === 'playing' ? 'bg-brand-accent text-black border-brand-accent shadow-[0_0_20px_rgba(242,162,1,0.3)]' : 
            status === 'error' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
            'bg-white text-black border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'}`}
      >
        <AnimatePresence mode="wait">
          {status === 'loading' ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loader2 size={16} className="animate-spin" />
            </motion.div>
          ) : status === 'playing' ? (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-0.5">
               <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-black rounded-full" />
               <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-black rounded-full" />
               <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-black rounded-full" />
            </motion.div>
          ) : status === 'error' ? (
            <AlertCircle key="error" size={16} />
          ) : (
            <Volume2 key="idle" size={16} />
          )}
        </AnimatePresence>
        
        <span>
          {status === 'loading' ? 'Sintetizando Voz...' : 
           status === 'playing' ? 'Ouvindo Resumo' : 
           status === 'error' ? 'Erro de Áudio' :
           'Resumo em Áudio'}
        </span>

        {audioUrl && status !== 'playing' && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-black">
              <Check size={10} className="text-black" />
          </div>
        )}
      </motion.button>

      {audioUrl && status === 'idle' && (
         <button 
           onClick={playAudio}
           className="p-4 rounded-2xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white"
           title="Repetir Resumo"
         >
            <RotateCcw size={16} />
         </button>
      )}
    </div>
  );
};
