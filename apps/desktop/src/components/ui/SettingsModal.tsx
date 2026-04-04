import { X, Mic, Volume2, Upload, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useVoiceStore } from '../../context/VoiceContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const { 
        vadAuto, setVadAuto,
        vadMode, setVadMode,
        vadThreshold, setVadThreshold,
        pttKey, setPttKey,
        voiceAvatar, setVoiceAvatar,
        rawMicVolumeRef
    } = useVoiceStore();

    const [micVolume, setMicVolume] = useState(0);
    const animationRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [listeningToKey, setListeningToKey] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        
        let shouldContinue = true;
        const updateAudioLevel = () => {
            const rms = rawMicVolumeRef.current;
            // Convertir la pression sonore pure en décibels (silence absolu vers ~0.00001 -> -100dB)
            const db = rms > 0 ? 20 * Math.log10(rms) : -100;
            // Map -100dB (total silence) .. 0dB (clipping loudest) vers la valeur pourcentage 0-100% de la barre
            const volPercent = db + 100;
            
            // Appliquer l'état pour afficher visuellement
            setMicVolume(Math.max(0, Math.min(100, volPercent)));

            if (shouldContinue) {
                animationRef.current = requestAnimationFrame(updateAudioLevel);
            }
        };

        animationRef.current = requestAnimationFrame(updateAudioLevel);

        return () => {
            shouldContinue = false;
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isOpen, rawMicVolumeRef]);

    // Handle Keyboard listener
    useEffect(() => {
        if (!listeningToKey) return;

        const handleKey = (e: KeyboardEvent) => {
            e.preventDefault();
            setPttKey(e.code);
            setListeningToKey(false);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [listeningToKey, setPttKey]);

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setVoiceAvatar(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="w-full flex">
                <div className="w-1/3 bg-[#2b2d31] flex justify-end py-16 pr-6">
                    <nav className="w-full max-w-[200px] flex flex-col gap-1">
                        <div className="px-2 pb-1 text-[11px] font-bold text-[#949ba4] uppercase">Paramètres Utilisateur</div>
                        <button className="px-3 py-2 text-left rounded-[4px] text-[#f2f3f5] bg-[#404249] font-medium text-[15px]">Voix & Vidéo</button>
                    </nav>
                </div>
                
                <div className="flex-1 bg-[#313338] py-16 pl-10 pr-6 relative max-w-4xl">
                    <div className="absolute top-10 right-10 flex flex-col items-center gap-2">
                        <button 
                            className="w-9 h-9 rounded-full border-2 border-[#b5bac1] text-[#b5bac1] flex items-center justify-center hover:bg-[#b5bac1]/10 transition-colors"
                            onClick={onClose}
                        >
                            <X size={20} />
                        </button>
                        <span className="text-[13px] font-semibold text-[#b5bac1]">ÉCHAP</span>
                    </div>

                    <div className="max-w-[700px]">
                        <h2 className="text-[#f2f3f5] text-[20px] font-bold mb-6">Voix & Vidéo</h2>

                        <div className="mb-8">
                            <h3 className="text-[#b5bac1] text-[12px] font-bold uppercase mb-2">Avatar de stream (Optionnel)</h3>
                            <div className="flex items-center gap-4 bg-[#2b2d31] p-4 rounded-lg">
                                <div className="w-20 h-20 rounded-full bg-[#1e1f22] overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-black/20">
                                    {voiceAvatar ? <img src={voiceAvatar} alt="Avatar" className="w-full h-full object-cover" /> : <Mic size={32} className="text-[#80848e]" />}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
                                    <button 
                                        className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-[14px] font-medium px-4 py-2 rounded transition-colors flex items-center gap-2"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload size={16} /> Importer une image
                                    </button>
                                    <button 
                                        className="text-[#f23f42] hover:underline text-[13px] flex items-center gap-1 font-medium"
                                        onClick={() => setVoiceAvatar(null)}
                                        disabled={!voiceAvatar}
                                    >
                                        <Trash2 size={14} /> Supprimer l'avatar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="h-[1px] bg-white/10 my-6" />

                        <div className="mb-8 flex flex-col gap-4">
                            <h3 className="text-[#f2f3f5] text-[16px] font-bold">Mode d'Entrée</h3>
                            
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-3 bg-[#2b2d31] p-3 rounded-lg cursor-pointer border border-transparent hover:border-black/20">
                                    <input type="radio" name="vadMode" checked={vadMode === 'VAD'} onChange={() => setVadMode('VAD')} className="scale-125 accent-[#5865f2]" />
                                    <div className="flex flex-col">
                                        <span className="text-[#dbdee1] font-medium">Détection de la voix</span>
                                        <span className="text-[#b5bac1] text-[13px]">Activer automatiquement le microphone lorsque vous parlez.</span>
                                    </div>
                                </label>
                                
                                <label className="flex items-center gap-3 bg-[#2b2d31] p-3 rounded-lg cursor-pointer border border-transparent hover:border-black/20">
                                    <input type="radio" name="vadMode" checked={vadMode === 'PTT'} onChange={() => setVadMode('PTT')} className="scale-125 accent-[#5865f2]" />
                                    <div className="flex flex-col">
                                        <span className="text-[#dbdee1] font-medium">Appuyer pour parler</span>
                                        <span className="text-[#b5bac1] text-[13px]">Ne transmet l'audio que si le raccourci est pressé.</span>
                                    </div>
                                </label>
                            </div>

                            {vadMode === 'PTT' && (
                                <div className="mt-2 flex flex-col">
                                    <h3 className="text-[#b5bac1] text-[12px] font-bold uppercase mb-2">Raccourci Clavier (Maintiens appuyé)</h3>
                                    <button 
                                        className={`bg-[#1e1f22] border ${listeningToKey ? 'border-[#5865f2] shadow-[0_0_0_2px_rgba(88,101,242,0.2)]' : 'border-black/30 hover:border-[#80848e]'} rounded py-3 px-4 text-[#dbdee1] font-medium w-64 text-left transition-all focus:outline-none flex justify-between items-center`}
                                        onClick={() => setListeningToKey(true)}
                                    >
                                        <span>{listeningToKey ? 'En écoute...' : pttKey.replace('Key', '')}</span>
                                        {listeningToKey && <span className="animate-pulse w-2 h-2 rounded-full bg-red-500"></span>}
                                    </button>
                                </div>
                            )}

                            {vadMode === 'VAD' && (
                                <div className="mt-4 flex flex-col gap-4">
                                    <h3 className="text-[#f2f3f5] text-[16px] font-bold">Détection de la voix</h3>
                                    
                                    <div className="bg-[#2b2d31] rounded-lg p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[#dbdee1] text-[14px] font-medium">Sensibilité Automatique</span>
                                            <label className="relative inline-block w-10 h-5 cursor-pointer">
                                                <input type="checkbox" className="peer w-0 h-0 opacity-0" checked={vadAuto} onChange={(e) => setVadAuto(e.target.checked)} />
                                                <span className={`absolute top-0 left-0 right-0 bottom-0 ${vadAuto ? 'bg-[#23a55a]' : 'bg-[#80848e]'} transition-all duration-300 rounded-full before:absolute before:content-[''] before:h-3.5 before:w-3.5 before:left-1 before:bottom-0.75 before:bg-white before:transition-all before:duration-300 before:rounded-full ${vadAuto ? 'before:translate-x-4' : ''}`}></span>
                                            </label>
                                        </div>

                                        <div className={`flex flex-col gap-4 mt-8 transition-opacity ${vadAuto ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                            <div className="relative w-full h-6 flex items-center group">
                                                {/* Tooltip db */}
                                                <div 
                                                    className="absolute -top-7 -translate-x-1/2 bg-[#1e1f22] text-white text-[12px] font-bold py-[3px] px-[8px] rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap"
                                                    style={{ left: `${vadThreshold * 100}%` }}
                                                >
                                                    {Math.round(-100 + (vadThreshold * 100))}dB
                                                </div>

                                                {/* Background track */}
                                                <div className="absolute left-0 w-full h-4 rounded overflow-hidden bg-[#1e1f22]">
                                                    <div 
                                                        className="absolute inset-0" 
                                                        style={{ background: `linear-gradient(to right, rgba(240,178,50,0.3) ${vadThreshold * 100}%, rgba(35,165,90,0.3) ${vadThreshold * 100}%)` }} 
                                                    />
                                                    <div 
                                                        className="absolute inset-0 transition-all duration-75"
                                                        style={{ 
                                                            background: `linear-gradient(to right, #f0b232 ${vadThreshold * 100}%, #23a55a ${vadThreshold * 100}%)`,
                                                            clipPath: `inset(0 ${100 - micVolume}% 0 0)`
                                                        }}
                                                    />
                                                </div>
                                                
                                                {/* Input Slider */}
                                                <input 
                                                    type="range" 
                                                    className="absolute left-0 w-full h-full cursor-pointer bg-transparent appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:shadow-md z-20"
                                                    min="0" max="1" step="0.01"
                                                    value={vadThreshold}
                                                    onChange={(e) => setVadThreshold(parseFloat(e.target.value))}
                                                    disabled={vadAuto}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[11px] text-[#949ba4] font-bold uppercase px-1">
                                                <span>Ajuster le seuil manuellement</span>
                                                <span className="flex items-center gap-1"><Volume2 size={12} /> Test micro en direct</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
