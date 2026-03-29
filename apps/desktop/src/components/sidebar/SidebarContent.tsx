import { Hash, Headphones, MicOff } from 'lucide-react';
import SidebarContentProps from '../../models/sidebarContentProps.model';

export const SidebarContent = ({
    channelId,
    onJoin,
    salons,
    localUserId,
}: SidebarContentProps) => (
    <div className="flex flex-col h-full bg-[#2b2d31] select-none">
        {/* Section salons vocaux */}
        <div className="pt-3 pb-1 px-4 font-bold text-[#949ba4] uppercase text-[11px] tracking-wider select-none">
            Salons vocaux
        </div>
        <div className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {salons.length === 0 ? (
                <div className="text-xs text-gray-500 italic px-2">Aucun salon disponible</div>
            ) : (
                salons.map((salon) => (
                    <div key={salon.id} className="mb-1">
                        <button
                            onClick={() => onJoin(salon.id)}
                            className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left text-[15px] font-medium transition-colors duration-100 group
                                ${channelId === salon.id ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}
                            `}
                        >
                            <Hash size={20} className="text-[#80848e]" />
                            <span className="truncate flex-1">{salon.name}</span>
                        </button>

                        {/* Liste des membres du salon */}
                        <div className="pl-8 mt-0.5 space-y-0.5">
                            {salon.members.map((member) => (
                                <div key={member.userId} className="flex items-center gap-2 py-1 group rounded-[4px] px-2 hover:bg-[#35373c] cursor-pointer">
                                    <div className={`w-6 h-6 rounded-full bg-[#5865f2] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0
                                        ${member.userId === localUserId ? 'ring-2 ring-[#248046]' : ''}
                                    `}>
                                        {member.username.slice(0, 1).toUpperCase()}
                                    </div>
                                    <span className="text-[14px] text-[#949ba4] group-hover:text-[#dbdee1] truncate flex-1 font-medium">
                                        {member.username}
                                    </span>
                                    
                                    {/* Icônes de statut (Muet / Casque) */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {member.isMuted && !member.isDeafened && (
                                            <span title="Muet">
                                                <MicOff size={14} className="text-[#f23f42]" />
                                            </span>
                                        )}
                                        {member.isDeafened && (
                                            <>
                                                <span title="Muet">
                                                    <MicOff size={14} className="text-[#f23f42]" />
                                                </span>
                                                <span title="Sourdine">
                                                    <Headphones size={14} className="text-[#f23f42]" />
                                                </span>
                                            </>
                                        )}
                                        {!member.isMuted && !member.isDeafened && (
                                            <span className="text-[#23a55a] text-[10px] font-bold px-1 bg-[#23a55a]/10 rounded-sm">LIVE</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Section salons textuels */}
        <div className="pt-3 pb-1 px-4 font-bold text-[#949ba4] uppercase text-[11px] tracking-wider select-none">
            Canaux texte
        </div>
        <div className="px-2 space-y-0.5 mb-2">
            <button className="w-full flex items-center gap-1.5 text-left text-[15px] text-[#949ba4] px-2 py-1.5 rounded-md hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors duration-100 group">
                <Hash size={20} className="text-[#80848e]" />
                annonces
            </button>
            <button className="w-full flex items-center gap-1.5 text-left text-[15px] text-[#949ba4] px-2 py-1.5 rounded-md hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors duration-100 group">
                <Hash size={20} className="text-[#80848e]" />
                logs
            </button>
        </div>
    </div>
);
