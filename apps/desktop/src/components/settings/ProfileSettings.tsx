import { Mic, Trash2, Upload } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useVoiceStore } from "../../context/VoiceContext";
import { useAuth } from "../../context/AuthContext";

export const ProfileSettings = () => {
    const { voiceAvatar, setVoiceAvatar } = useVoiceStore();
    const { username, updateUsername } = useAuth();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [nameInputValue, setNameInputValue] = useState(username || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setNameInputValue(username || '');
    }, [username]);

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setVoiceAvatar(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveName = () => {
        const newName = nameInputValue.trim();
        if (newName && newName !== username) {
            setIsSaving(true);
            updateUsername(newName);
            setTimeout(() => {
                setIsSaving(false);
            }, 300);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-[#f2f3f5] text-[20px] font-bold">Mon Profil</h2>

            <div className="flex flex-col gap-6">
                <div>
                    <h3 className="text-[#b5bac1] text-[12px] font-bold uppercase mb-2">Avatar</h3>
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
                                <Upload size={16} /> Changer d'avatar
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

                <div className="h-[1px] bg-white/10" />

                <div>
                    <h3 className="text-[#b5bac1] text-[12px] font-bold uppercase mb-2">Nom d'affichage</h3>
                    <div className="bg-[#2b2d31] p-4 rounded-lg">
                        <div className="flex flex-col gap-2">
                            <p className="text-[#dbdee1] text-[14px] mb-2">C'est ainsi que les autres utilisateurs te verront dans les salons vocaux et textuels.</p>
                            <input 
                                type="text"
                                className="w-full bg-[#1e1f22] text-[#dbdee1] p-3 rounded focus:outline-none focus:ring-2 focus:ring-[#5865f2] transition-shadow text-[15px]" 
                                value={nameInputValue}
                                onChange={(e) => setNameInputValue(e.target.value)}
                                placeholder="Ton nom d'affichage"
                                maxLength={32}
                            />
                            
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={handleSaveName}
                                    disabled={!nameInputValue.trim() || nameInputValue.trim() === username || isSaving}
                                    className="bg-[#23a55a] hover:bg-[#1a7f44] disabled:bg-[#23a55a]/50 disabled:cursor-not-allowed text-white text-[14px] font-medium px-6 py-2 rounded transition-colors"
                                >
                                    {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

