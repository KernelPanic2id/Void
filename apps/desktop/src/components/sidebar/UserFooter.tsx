import { Headphones, Mic, MicOff, Settings, PhoneOff, LogOut, MonitorUp, MonitorOff } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import UserFooterProps from '../../models/userFooterProps.model';

const NetworkIcon = ({ quality }: { quality: 0 | 1 | 2 | 3 }) => {
    const getColor = () => {
        if (quality === 3) return '#23a55a';
        if (quality === 2) return '#f0b232';
        if (quality === 1) return '#f23f42';
        return '#80848e';
    };

    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={getColor()}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 transition-colors duration-300"
        >
            <circle cx="5" cy="19" r="1" opacity={quality > 0 ? 1 : 0.5} />
            <path d="M4 11a9 9 0 0 1 9 9" opacity={quality >= 2 ? 1 : 0.2} />
            <path d="M4 4a16 16 0 0 1 16 16" opacity={quality >= 3 ? 1 : 0.2} />
        </svg>
    );
};

const UserFooter = ({
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
    onStream,
    isStreaming,
    networkQuality = 3,
    ping = 24,
    averagePing = 24,
    packetLoss = 0,
    updateCheck,
    onOpenSettings,
    avatarUrl,
}: UserFooterProps) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [showPing, setShowPing] = useState(false);
    const [showVoiceDetails, setShowVoiceDetails] = useState(false);
    const [voiceDetailsTab, setVoiceDetailsTab] = useState<'connexion' | 'confidentialité'>('connexion');

    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const voiceDetailsRef = useRef<HTMLDivElement>(null);
    const voiceConnectedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (buttonRef.current && buttonRef.current.contains(e.target as Node)) {
                return; // Géré par le onClick du bouton
            }
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
            if (showVoiceDetails) {
                if (voiceConnectedRef.current && voiceConnectedRef.current.contains(e.target as Node)) return;
                if (voiceDetailsRef.current && !voiceDetailsRef.current.contains(e.target as Node)) {
                    setShowVoiceDetails(false);
                }
            }
        }
        if (menuOpen || showVoiceDetails) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen, showVoiceDetails]);

    const fontStyle = { fontFamily: 'gg sans, "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif' };

    const handleSettingsClick = () => {
        if (onOpenSettings) {
            onOpenSettings();
        } else {
            setMenuOpen((v) => !v);
        }
    };

    return (
        <div className="w-full select-none bg-[#232428] flex flex-col flex-shrink-0 border-t border-black/10">
            {channelId && (
                <div className="h-[48px] px-2 flex items-center border-b border-white/[0.04] relative">
                    {showVoiceDetails && isConnected && (
                        <div
                            ref={voiceDetailsRef}
                            className="absolute bottom-full left-0 mb-3 ml-2 w-[340px] bg-[#313338] rounded-[8px] shadow-2xl border border-[#1e1f22] z-50 animate-in fade-in zoom-in duration-200"
                        >
                            <div className="p-4 pt-5">
                                <h3 className="text-white text-[20px] font-bold mb-4" style={fontStyle}>Détails de la voix</h3>
                                <div className="flex border-b border-[#3f4147] mb-4">
                                    <button
                                        onClick={() => setVoiceDetailsTab('connexion')}
                                        className={`pb-2 px-1 mr-4 text-[14px] font-medium transition-colors ${voiceDetailsTab === 'connexion' ? 'text-[#5865f2] border-b-2 border-[#5865f2]' : 'text-[#b5bac1] hover:text-[#dbdee1]'}`}
                                    >
                                        Connexion
                                    </button>
                                    <button
                                        onClick={() => setVoiceDetailsTab('confidentialité')}
                                        className={`pb-2 px-1 text-[14px] font-medium transition-colors ${voiceDetailsTab === 'confidentialité' ? 'text-[#5865f2] border-b-2 border-[#5865f2]' : 'text-[#b5bac1] hover:text-[#dbdee1]'}`}
                                    >
                                        Confidentialité
                                    </button>
                                </div>
                                {voiceDetailsTab === 'connexion' ? (
                                    <div className="text-[14px] text-[#dbdee1]" style={fontStyle}>
                                        <div className="mb-1">
                                            <span className="font-semibold">Latence moyenne : </span>
                                            <span className="font-bold text-white">{averagePing} ms</span>
                                        </div>
                                        <div className="mb-1">
                                            <span className="font-semibold">Dernière latence enregistrée : </span>
                                            <span className="font-bold text-white">{ping} ms</span>
                                        </div>
                                        <div className="mb-4">
                                            <span className="font-semibold">Taux de perte de paquets sortants : </span>
                                            <span className="font-bold text-white">{packetLoss.toFixed(1)} %</span>
                                        </div>
                                        <p className="text-[#b5bac1] leading-relaxed">
                                            Tu constateras peut-être un décalage de l'audio à partir de 250 ms. Il se peut qu'on t'entende avec une voix robotique si ton taux de perte de paquets est supérieur à 10 %. Si le problème persiste, déconnecte-toi et réessaye.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-[14px] text-[#dbdee1]" style={fontStyle}>
                                        <p className="text-[#b5bac1] leading-relaxed">
                                            La transmission vocale et vidéo n'est pas complètement chiffrée de bout en bout pour le moment sur DiscordWASM. Notre protocole de signalisation est sécurisé, mais l'architecture serveur (SFU) nécessite de déchiffrer les flux média (DTLS/SRTP) en mémoire pour les redistribuer aux autres pairs.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="bg-[#2b2d31] p-3 rounded-b-[8px] flex items-center justify-between border-t border-[#1e1f22]">
                                <div className="flex items-center text-[#23a55a] text-[12px] font-semibold">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                    Chiffré de bout en bout
                                </div>
                                <a href="#" className="text-[#00a8fc] hover:underline text-[12px] font-medium">En savoir plus</a>
                            </div>
                        </div>
                    )}
                    <div 
                        ref={voiceConnectedRef}
                        className="flex items-center flex-1 min-w-0 px-1 py-1 rounded-[4px] hover:bg-[#35373c] cursor-pointer relative group"
                        onMouseEnter={() => setShowPing(true)}
                        onMouseLeave={() => setShowPing(false)}
                        onClick={() => setShowVoiceDetails(prev => !prev)}
                    >
                        <NetworkIcon quality={isConnected ? networkQuality : 0} />
                        
                        {showPing && isConnected && (
                            <div className="absolute -top-10 left-0 bg-[#111214] text-white text-[12px] px-2 py-1 rounded-[4px] shadow-xl whitespace-nowrap z-50 animate-in fade-in zoom-in duration-150">
                                <span className="font-bold">{ping}ms</span>
                                <div className="absolute -bottom-1 left-2 w-2 h-2 bg-[#111214] rotate-45" />
                            </div>
                        )}

                        <div className="ml-2 flex flex-col min-w-0 leading-tight">
                            <div 
                                className={`text-[14px] font-bold truncate ${isConnected ? 'text-[#23a55a]' : 'text-[#80848e]'}`} 
                                style={fontStyle}
                            >
                                {isConnected ? 'Voice Connected' : 'Connecting...'}
                            </div>
                            <div className="text-[12px] text-[#b5bac1] truncate" style={fontStyle}>
                                Salon vocal
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button 
                            onClick={onStream}
                            className={`w-8 h-8 flex items-center justify-center rounded-[4px] transition-colors ${isStreaming ? 'text-[#23a55a] bg-[#23a55a]/10 hover:bg-[#23a55a]/20' : 'text-[#dbdee1] hover:bg-[#35373c] hover:text-[#f2f3f5]'}`}
                            title={isStreaming ? "Arrêter le stream" : "Lancer un stream"}
                        >
                            {isStreaming ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
                        </button>
                        <button 
                            onClick={onLeave}
                            className="w-8 h-8 flex items-center justify-center rounded-[4px] text-[#dbdee1] hover:bg-[#35373c] hover:text-[#ed4245] transition-colors"
                            title="Quitter le salon"
                        >
                            <PhoneOff size={20} />
                        </button>
                    </div>
                </div>
            )}

            <div className="h-[52px] flex items-center px-2">
                <div className="flex items-center min-w-0 flex-1 px-1 py-1 rounded-[4px] hover:bg-[#35373c] cursor-pointer transition-colors duration-150">
                    <div className="relative flex-shrink-0">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className={`w-8 h-8 rounded-full object-cover transition-all duration-300 ${isSpeaking ? 'ring-2 ring-[#248046]' : ''}`} />
                        ) : (
                            <div
                                className={`w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-[14px] font-bold text-white transition-all duration-300
                                ${isSpeaking ? 'ring-2 ring-[#248046]' : ''}`}
                            >
                                {username.slice(0, 1).toUpperCase()}
                            </div>
                        )}
                        <div className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-[#23a55a] border-[3px] border-[#232428]" />
                    </div>
                    
                    <div className="ml-2 flex flex-col justify-center min-w-0 leading-tight">
                        <div className="text-[14px] font-semibold text-[#f2f3f5] truncate" style={fontStyle}>
                            {username}
                        </div>
                        <div className="text-[12px] text-[#b5bac1] font-normal" style={fontStyle}>
                            En ligne
                        </div>
                    </div>
                </div>

                <div className="flex items-center">
                    <button
                        onClick={onToggleMute}
                        disabled={!channelId}
                        className="w-8 h-8 flex items-center justify-center rounded-[4px] text-[#dbdee1] hover:bg-[#35373c] hover:text-[#f2f3f5] transition-colors"
                    >
                        {isMuted ? <MicOff size={20} className="text-[#fa777c]" /> : <Mic size={20} />}
                    </button>
                    <button
                        onClick={onToggleDeafen}
                        disabled={!channelId}
                        className="w-8 h-8 flex items-center justify-center rounded-[4px] text-[#dbdee1] hover:bg-[#35373c] hover:text-[#f2f3f5] transition-colors"
                    >
                        <Headphones size={20} className={isDeafened ? 'text-[#fa777c]' : ''} />
                    </button>
                    <div className="relative">
                        <button
                            ref={buttonRef}
                            onClick={handleSettingsClick}
                            className={`w-8 h-8 flex items-center justify-center rounded-[4px] text-[#dbdee1] hover:bg-[#35373c] hover:text-[#f2f3f5] transition-colors ${menuOpen ? 'bg-[#35373c] text-[#f2f3f5]' : ''}`}
                        >
                            <Settings size={20} />
                        </button>
                        {menuOpen && (
                            <div ref={menuRef} className="absolute right-0 bottom-[48px] mb-2 w-[220px] bg-[#111214] rounded-[4px] shadow-xl py-2 px-2 z-50 border border-black/20">
                                <button onClick={updateCheck} className="w-full flex items-center justify-between px-2 py-1.5 text-[14px] text-[#dbdee1] rounded-[2px] hover:bg-[#4752c4] hover:text-white transition-colors mb-1" style={fontStyle}>
                                    Vérifier les mises à jour
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                                <div className="h-[1px] bg-[#ffffff]/[0.06] my-1" />
                                <button onClick={onLogout} className="w-full flex items-center justify-between px-2 py-1.5 text-[14px] text-[#fa777c] rounded-[2px] hover:bg-[#fa777c] hover:text-white transition-colors" style={fontStyle}>
                                    Se déconnecter
                                    <LogOut size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserFooter;
