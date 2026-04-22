/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Deputado } from '../services/camara';
import { motion } from 'motion/react';

interface Props {
  deputado: Deputado;
  onClick: (deputado: Deputado) => void;
  key?: string | number;
}

export const DeputadoCard = ({ deputado, onClick }: Props) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8 }}
      className="relative flex flex-col cursor-pointer group"
      onClick={() => onClick(deputado)}
    >
      <div className="aspect-[3/4] w-full rounded-2xl bg-neutral-900 border border-white/5 overflow-hidden mb-5 relative shadow-2xl">
        <img
          src={deputado.urlFoto}
          alt={deputado.nome}
          className="w-full h-full object-cover transition-all duration-700 grayscale group-hover:grayscale-0 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        
        {/* Partido Badge on Image */}
        <div className="absolute bottom-4 left-4 right-4">
           <span className="text-[9px] font-black bg-white/10 backdrop-blur-md text-white px-2 py-1 rounded inline-block uppercase tracking-[0.2em] border border-white/10">
             {deputado.siglaPartido}
           </span>
        </div>
      </div>
      
      <div className="flex flex-col px-1">
        <h3 className="font-black text-sm uppercase tracking-tighter text-white group-hover:text-neutral-400 transition-colors">
          {deputado.nome}
        </h3>
        <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mt-1">
          Representante • {deputado.siglaUf}
        </p>
      </div>
    </motion.div>
  );
};
