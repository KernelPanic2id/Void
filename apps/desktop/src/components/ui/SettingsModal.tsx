import { X } from 'lucide-react';
import { useState } from 'react';
import { SettingsModalProps } from '../../models/settingsModalProps.model';
import { ProfileSettings } from '../settings/ProfileSettings';
import { VoiceVideoSettings } from '../settings/VoiceVideoSettings';
import { ActivitySettings } from '../settings/ActivitySettings';
import { UpdateSettings } from '../settings/UpdateSettings';

export const SettingsModal = ({ isOpen, onClose, updateAvailable, updateStatus, triggerUpdate, checkForUpdate }: SettingsModalProps) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'voice' | 'activity' | 'update'>('profile');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="flex w-[900px] h-[80vh] max-h-[800px] bg-[#313338] rounded-xl overflow-hidden shadow-2xl relative">
                {/* Sidebar */}
                <div className="w-[280px] bg-[#2b2d31] flex flex-col py-10 pl-6 pr-4 shrink-0">
                    <nav className="w-full flex flex-col gap-1">
                        <div className="px-2 pb-1 text-[11px] font-bold text-[#949ba4] uppercase">Paramètres Utilisateur</div>
                        <button 
                            className={`px-3 py-2 text-left rounded-[4px] font-medium text-[15px] ${activeTab === 'profile' ? 'text-[#f2f3f5] bg-[#404249]' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
                            onClick={() => setActiveTab('profile')}
                        >
                            Mon Profil
                        </button>
                        <button 
                            className={`px-3 py-2 text-left rounded-[4px] font-medium text-[15px] ${activeTab === 'voice' ? 'text-[#f2f3f5] bg-[#404249]' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
                            onClick={() => setActiveTab('voice')}
                        >
                            Voix & Vidéo
                        </button>
                    </nav>
                    
                    <div className="my-2 h-[1px] bg-white/10 mx-2" />
                    
                    <nav className="w-full flex flex-col gap-1">
                        <div className="px-2 pb-1 text-[11px] font-bold text-[#949ba4] uppercase">Paramètres d'activité</div>
                        <button 
                            className={`px-3 py-2 text-left rounded-[4px] font-medium text-[15px] ${activeTab === 'activity' ? 'text-[#f2f3f5] bg-[#404249]' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
                            onClick={() => setActiveTab('activity')}
                        >
                            Jeux enregistrés
                        </button>
                    </nav>
                    
                    <div className="my-2 h-[1px] bg-white/10 mx-2" />
                    
                    <nav className="w-full flex flex-col gap-1">
                        <div className="px-2 pb-1 text-[11px] font-bold text-[#949ba4] uppercase">Application</div>
                        <button 
                            className={`px-3 py-2 text-left rounded-[4px] font-medium text-[15px] ${activeTab === 'update' ? 'text-[#f2f3f5] bg-[#404249]' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
                            onClick={() => setActiveTab('update')}
                        >
                            Mises à jour {updateAvailable && <span className="ml-2 w-2 h-2 inline-block bg-[#f23f42] rounded-full" />}
                        </button>
                    </nav>
                </div>
                
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative">
                    <button 
                        className="absolute top-6 right-6 w-9 h-9 rounded-full border-2 border-[#b5bac1] text-[#b5bac1] flex items-center justify-center hover:bg-[#b5bac1]/10 transition-colors z-10"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute top-[68px] right-6 text-[13px] font-semibold text-[#b5bac1] z-10">ÉCHAP</div>
                    
                    <div className="flex-1 overflow-y-auto py-10 px-10">
                        <div className="max-w-[700px]">
                            {activeTab === 'profile' && <ProfileSettings />}
                            {activeTab === 'voice' && <VoiceVideoSettings />}
                            {activeTab === 'activity' && <ActivitySettings />}
                            {activeTab === 'update' && (
                                <UpdateSettings 
                                    updateAvailable={updateAvailable}
                                    updateStatus={updateStatus}
                                    triggerUpdate={triggerUpdate}
                                    checkForUpdate={checkForUpdate}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
