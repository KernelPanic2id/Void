import React, { useState } from 'react';
import { useServer } from '../../context/ServerContext';
import { Globe, Plus } from 'lucide-react';
import { Modal } from './Modal';
import ServerModalProps from '../../models/serverModalProps.model';

export const ServerModal = ({ isOpen, onClose }: ServerModalProps) => {
  const { createServer, joinServer } = useServer();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (tab === 'create') {
      await createServer(inputValue);
    } else {
      await joinServer(inputValue);
    }
    setInputValue('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tab === 'create' ? 'Créer un Serveur' : 'Rejoindre un Serveur'}>
      {/* Tab switcher */}
      <div className="flex gap-2 mb-8 glass p-1.5 rounded-lg">
        <button
          onClick={() => setTab('create')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-bold rounded-md transition-all duration-300 ${
            tab === 'create'
              ? 'bg-cyan-500/20 text-cyan-50 shadow-[0_0_15px_rgba(34,211,238,0.15)] outline outline-1 outline-cyan-500/30'
              : 'text-cyan-500/50 hover:text-cyan-300 hover:bg-cyan-500/5'
          }`}
        >
          <Plus size={16} /> Créer
        </button>
        <button
          onClick={() => setTab('join')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-bold rounded-md transition-all duration-300 ${
            tab === 'join'
              ? 'bg-cyan-500/20 text-cyan-50 shadow-[0_0_15px_rgba(34,211,238,0.15)] outline outline-1 outline-cyan-500/30'
              : 'text-cyan-500/50 hover:text-cyan-300 hover:bg-cyan-500/5'
          }`}
        >
          <Globe size={16} /> Rejoindre
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label className="block text-[11px] font-black text-cyan-500/70 uppercase tracking-widest mb-3">
            {tab === 'create' ? 'Nom du Serveur' : "Code d'invitation ou ID"}
          </label>
          <div className="relative group">
            <div className="absolute inset-0 bg-cyan-400/20 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={tab === 'create' ? 'Mon super serveur...' : 'ex: ds9f8-dsv88...'}
              className="w-full relative bg-white/[0.04] text-cyan-50 px-4 py-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:outline-none focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all placeholder-cyan-500/30 font-medium backdrop-blur-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-3 pt-4 border-t border-cyan-500/10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-[14px] font-bold text-cyan-500/70 hover:text-cyan-300 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[14px] font-bold rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {tab === 'create' ? 'Initialiser' : 'Connexion'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
