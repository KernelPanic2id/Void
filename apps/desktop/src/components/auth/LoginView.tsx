// src/components/auth/LoginView.tsx
import { useState } from 'react';
import LoginViewProps from '../../models/loginViewProps.model';

export const LoginView = ({ onLogin }: LoginViewProps) => {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim().length >= 2) {
            onLogin(name.trim());
        }
    };

    return (
        <div className="flex-1 w-full flex items-center justify-center p-4 relative overflow-hidden">
            <div className="w-full max-w-[440px] glass-heavy rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(34,211,238,0.05)] p-10 flex flex-col items-center relative z-10">
                <h1 className="text-2xl font-black text-cyan-50 mb-1 text-center uppercase tracking-widest">
                    Vocal WASM
                </h1>
                <p className="text-cyan-500/50 text-center mb-8 text-[13px] font-medium">
                    Identifie-toi pour rejoindre le réseau vocal.
                </p>

                <form onSubmit={handleSubmit} className="w-full space-y-5">
                    <div>
                        <label className="block text-[11px] font-black uppercase text-cyan-500/60 mb-2 tracking-widest">
                            Nom d'utilisateur
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#050511]/80 p-3 rounded-lg border border-white/[0.08] text-cyan-50 placeholder-cyan-500/30 focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all font-medium"
                            placeholder="Pseudo"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={name.trim().length < 2}
                        className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] uppercase tracking-wider text-[13px]"
                    >
                        Rejoindre
                    </button>
                </form>

                <span className="mt-8 text-[10px] text-cyan-500/30 font-bold uppercase tracking-widest">
                    Persistence Locale · Zéro DB
                </span>
            </div>
        </div>
    );
};