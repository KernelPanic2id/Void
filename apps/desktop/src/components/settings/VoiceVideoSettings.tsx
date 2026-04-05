import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useVoiceStore } from "../../context/VoiceContext";

export const VoiceVideoSettings = () => {
    const { 
        vadAuto, setVadAuto,
        vadMode, setVadMode,
        vadThreshold, setVadThreshold,
        pttKey, setPttKey,
        rawMicVolumeRef
    } = useVoiceStore();

    const [micVolume, setMicVolume] = useState(0);
    const animationRef = useRef<number | null>(null);
    const [listeningToKey, setListeningToKey] = useState(false);

    useEffect(() => {
        let shouldContinue = true;
        const updateAudioLevel = () => {
            const rms = rawMicVolumeRef.current;
            const db = rms > 0 ? 20 * Math.log10(rms) : -100;
            const volPercent = db + 100;
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
    }, [rawMicVolumeRef]);

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

    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-[#f2f3f5] text-[20px] font-bold">Voix & Vidéo</h2>


            <div className="flex flex-col gap-4">
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
                                    <div 
                                        className="absolute -top-7 -translate-x-1/2 bg-[#1e1f22] text-white text-[12px] font-bold py-[3px] px-[8px] rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap"
                                        style={{ left: `${vadThreshold * 100}%` }}
                                    >
                                        {Math.round(-100 + (vadThreshold * 100))}dB
                                    </div>

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
    );
};
