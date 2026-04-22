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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="premium-card rounded-2xl p-4 flex flex-col cursor-pointer group"
      onClick={() => onClick(deputado)}
    >
      <div className="aspect-square w-full rounded-xl bg-neutral-900 border border-white/5 overflow-hidden mb-4 relative">
        <img
          src={deputado.urlFoto}
          alt={deputado.nome}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-bold text-[13px] leading-tight text-white group-hover:text-brand-accent transition-colors truncate">
          {deputado.nome}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-neutral-500 font-bold text-[10px] tracking-widest uppercase">{deputado.siglaPartido}</span>
          <div className="w-1 h-1 bg-neutral-800 rounded-full" />
          <span className="text-neutral-600 text-[10px] font-medium uppercase tracking-tighter">{deputado.siglaUf}</span>
        </div>
      </div>
    </motion.div>
  );
};
