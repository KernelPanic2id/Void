import { useCallback, useState } from 'react';
import { useServer } from '../../context/ServerContext';
import { ServerModal } from '../ui/ServerModal';
import { useBentoLayout } from '../../hooks/useBentoLayout';
import { useBentoDrag } from '../../hooks/useBentoDrag';
import bgImage from '../../assets/background.png';

/**
 * Floating server bar. Draggable via Bento engine, auto-sized to content.
 * Always horizontal — anchored to the right, items flow right-to-left.
 */
export const ServerSidebar = () => {
    const { servers, activeServerId, setActiveServerId } = useServer();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { x, y, onMove } = useBentoLayout('server-bar');

    /** Invert dx since the bar uses `right` positioning instead of `left`. */
    const _onMoveInverted = useCallback(
        (delta: { dx: number; dy: number }) => onMove({ dx: -delta.dx, dy: delta.dy }),
        [onMove],
    );
    const handleDragStart = useBentoDrag(_onMoveInverted);

    return (
        <div className="absolute z-30" style={{ right: x, top: y }}>
            <nav className="flex flex-row-reverse items-center h-10 px-2 gap-2 glass-heavy
                shadow-[0_4px_20px_rgba(0,0,0,0.5)] rounded-xl border border-white/6"
            >
                {/* Drag handle */}
                <div
                    onMouseDown={handleDragStart}
                    className="shrink-0 h-full w-3 cursor-grab active:cursor-grabbing flex items-center justify-center
                        hover:bg-white/5 transition-colors rounded-r-xl"
                >
                    <div className="w-0.5 h-5 rounded-full bg-cyan-400/20" />
                </div>

                {/* VOID Logo — Home */}
                <div
                    className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold transition-all duration-300 cursor-pointer overflow-hidden shrink-0 group/sos
                        ${activeServerId === null
                            ? 'shadow-[0_0_15px_rgba(34,211,238,0.5)] border border-cyan-400/50'
                            : 'border border-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(34,211,238,0.3)]'}`}
                    onClick={() => setActiveServerId(null)}
                >
                    <img src={bgImage} alt="VOID" className="absolute inset-0 w-full h-full object-cover object-top-left scale-[3] opacity-90" />
                    <div className="absolute inset-0 bg-[#020208]/30" />
                    <div className={`absolute inset-0 bg-linear-to-tr from-cyan-400/20 to-blue-400/20 opacity-0 transition-opacity duration-300 ${activeServerId !== null ? 'group-hover/sos:opacity-100' : ''}`} />
                    <span className="relative z-10 text-[12px] font-black text-cyan-100 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">V</span>
                </div>

                {/* Separator */}
                <div className="w-0.5 h-6 bg-linear-to-b from-transparent via-cyan-500/30 to-transparent rounded-full opacity-50 shrink-0" />

                {/* Server List */}
                {servers.map(server => (
                    <div
                        key={server.id}
                        title={server.name}
                        className={`relative w-9 h-9 shrink-0 flex items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden group/srv
                        ${activeServerId === server.id
                            ? 'rounded-lg bg-linear-to-tr from-indigo-600 to-purple-600 text-white shadow-[0_0_15px_rgba(129,140,248,0.5)] border border-indigo-400/50'
                            : 'rounded-xl bg-[#0a0b14] text-cyan-200/60 border border-white/5 hover:border-indigo-500/40 hover:text-white hover:shadow-[0_0_12px_rgba(129,140,248,0.3)] hover:rounded-lg'}
                        `}
                        onClick={() => setActiveServerId(server.id)}
                    >
                        {server.icon ? (
                            <img src={server.icon} alt={server.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/srv:scale-110" />
                        ) : (
                            <span className="relative z-10 font-bold text-[10px] text-center tracking-wider">
                                {server.name.substring(0, 3).toUpperCase()}
                            </span>
                        )}
                        <div className={`absolute inset-0 bg-linear-to-tr from-indigo-500/20 to-purple-500/20 opacity-0 transition-opacity duration-300 ${activeServerId !== server.id ? 'group-hover/srv:opacity-100' : ''}`} />
                    </div>
                ))}

                {/* Create Server Button */}
                <div
                    className="relative w-9 h-9 shrink-0 bg-[#0a0b14] border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400/50 hover:text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:bg-cyan-900/40 transition-all duration-300 cursor-pointer overflow-hidden group/add"
                    onClick={() => setIsModalOpen(true)}
                >
                    <div className="absolute inset-0 scale-0 rounded-full bg-cyan-400/20 transition-transform duration-300 group-hover/add:scale-[2]" />
                    <span className="relative z-10 text-lg font-light leading-none">+</span>
                </div>
            </nav>
            <ServerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};
