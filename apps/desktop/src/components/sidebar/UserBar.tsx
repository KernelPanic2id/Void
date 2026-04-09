import { Headphones, Mic, MicOff, Settings, PhoneOff, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import UserBarProps from '../../models/ui/userBarProps.model';

export const UserBar = ({
    username,
    isConnected,
    isMuted,
    onToggleMute,
    isDeafened,
    onToggleDeafen,
    channelId,
    isSpeaking,
    onLeave,
    onLogout,
    updateCheck,
}: UserBarProps & { onLeave?: () => void; onLogout?: () => void; updateCheck?: () => void }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    return (
        <div className="w-full flex flex-col">
            <div className="flex items-center gap-2 px-2 py-1 bg-[#232428] border-t border-black/20 relative">
                <div className={`relative w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-sm font-bold text-white transition-all duration-300
                    ${isSpeaking ? 'ring-2 ring-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : ''}
                `}>
                    {username.slice(0, 1).toUpperCase()}
                    {isDeafened && (
                        <span className="absolute -right-1 -bottom-1 w-3 h-3 rounded-full bg-red-500 border-2 border-[#232428] inline-flex items-center justify-center">
                            <Headphones size={8} className="text-white" />
                        </span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-white truncate font-semibold leading-tight">{username}</div>
                    <div className="text-[9px] text-gray-400 uppercase tracking-wide leading-tight">
                        {isConnected ? (isMuted ? 'En vocal - muté' : 'En vocal') : 'Hors vocal'}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onToggleMute}
                        disabled={!channelId}
                        title={isMuted ? 'Unmute' : 'Mute'}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                        aria-pressed={isMuted}
                        className="w-7 h-7 rounded bg-[#3f4147] hover:bg-[#4a4d55] disabled:opacity-50 flex items-center justify-center cursor-pointer transition-all duration-100 active:scale-90"
                    >
                        {isMuted ? <MicOff size={13} className="text-red-300" /> : <Mic size={13} className="text-gray-200" />}
                    </button>
                    <button
                        onClick={onToggleDeafen}
                        disabled={!channelId}
                        title={isDeafened ? 'Activer le son entrant' : 'Couper le son entrant'}
                        aria-label={isDeafened ? 'Activer le son entrant' : 'Couper le son entrant'}
                        aria-pressed={isDeafened}
                        className="w-7 h-7 rounded bg-[#3f4147] hover:bg-[#4a4d55] disabled:opacity-50 flex items-center justify-center cursor-pointer transition-all duration-100 active:scale-90"
                    >
                        <Headphones size={13} className={isDeafened ? 'text-red-300' : 'text-gray-200'} />
                    </button>
                    <button
                        onClick={onLeave}
                        disabled={!channelId}
                        className="w-7 h-7 rounded bg-red-500/90 hover:bg-red-500 disabled:opacity-50 flex items-center justify-center cursor-pointer transition-all duration-100 active:scale-90"
                        title="Quitter le salon vocal"
                    >
                        <PhoneOff size={13} className="text-white" />
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setMenuOpen((v) => !v)}
                            className="w-7 h-7 rounded bg-[#3f4147] hover:bg-[#4a4d55] flex items-center justify-center cursor-pointer transition-all duration-100 active:scale-90"
                            aria-label="Paramètres"
                        >
                            <Settings size={13} className="text-gray-200" />
                        </button>
                        {menuOpen && (
                            <div ref={menuRef} className="absolute right-0 bottom-9 z-50 min-w-[160px] bg-[#232428] border border-black/30 rounded shadow-lg py-1">
                                <button
                                    onClick={onLogout}
                                    className="w-full text-left px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-[#2b2d31] transition-colors"
                                >
                                    <LogOut size={12} className="inline mr-2" /> Se déconnecter
                                </button>
                                <button
                                    onClick={updateCheck}
                                    className="w-full text-left px-4 py-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-[#2b2d31] transition-colors"
                                >
                                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="inline mr-2"><path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    Vérifier les mises à jour
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
