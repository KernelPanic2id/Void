import { CheckCircle, Download, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { UpdateSettingsProps } from "../../models/updateSettingsProps.model";

export const UpdateSettings = ({ updateAvailable, updateStatus, triggerUpdate, checkForUpdate }: UpdateSettingsProps) => {
    const [appVersion, setAppVersion] = useState<string>('');

    useEffect(() => {
        getVersion().then(v => setAppVersion(v)).catch(() => setAppVersion('0.0.0'));
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-[#f2f3f5] text-[20px] font-bold">Mises à jour de l'application</h2>
                                
            <div className="bg-[#2b2d31] p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-[#dbdee1] text-[16px] font-medium">Version actuelle</h3>
                        <p className="text-[#b5bac1] text-[14px]">v{appVersion}</p>
                    </div>
                    <button 
                        onClick={checkForUpdate}
                        disabled={updateStatus === 'Vérification...' || updateStatus === 'Installation de la mise à jour...'}
                        className="bg-[#4e5058] hover:bg-[#6d6f78] disabled:bg-[#4e5058]/50 disabled:cursor-not-allowed text-white text-[14px] font-medium px-4 py-2 rounded transition-colors flex items-center gap-2"
                    >
                        <RefreshCw size={16} className={(updateStatus === 'Vérification...' || updateStatus === 'Installation de la mise à jour...') ? 'animate-spin' : ''} />
                        Vérifier les mises à jour
                    </button>
                </div>

                {updateStatus && (
                    <div className={`flex items-center gap-2 mt-4 text-[14px] font-medium ${updateStatus.includes('Erreur') ? 'text-[#f23f42]' : 'text-[#b5bac1]'}`}>
                        {updateStatus.includes('Erreur') ? <X size={18} /> : <CheckCircle size={18} className="text-[#23a55a]" />}
                        <span>{updateStatus}</span>
                    </div>
                )}

                {!updateAvailable && !updateStatus && (
                    <div className="flex items-center gap-2 mt-4 text-[#23a55a]">
                        <CheckCircle size={18} />
                        <span className="text-[14px] font-medium">L'application est à jour.</span>
                    </div>
                )}

                {updateAvailable && (
                    <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                        <div>
                            <h3 className="text-[#23a55a] text-[16px] font-bold">Une mise à jour est disponible !</h3>
                            <p className="text-[#b5bac1] text-[14px] mt-1">Prête à être téléchargée et installée.</p>
                        </div>
                        <button 
                            onClick={triggerUpdate}
                            disabled={updateStatus === 'Installation de la mise à jour...'}
                            className="bg-[#23a55a] hover:bg-[#1a7f44] disabled:bg-[#23a55a]/50 text-white text-[14px] font-medium px-6 py-2 rounded transition-colors flex items-center gap-2"
                        >
                            <Download size={16} /> Mettre à jour
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


