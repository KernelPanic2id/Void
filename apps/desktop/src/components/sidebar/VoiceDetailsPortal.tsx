import { useRef, useEffect, useState, useCallback, RefObject } from 'react';
import { createPortal } from 'react-dom';

interface VoiceDetailsPortalProps {
    show: boolean;
    anchorRef: RefObject<HTMLDivElement | null>;
    onClose: () => void;
    voiceDetailsTab: 'connexion' | 'confidentialité';
    setVoiceDetailsTab: (tab: 'connexion' | 'confidentialité') => void;
    averagePing: number;
    ping: number;
    packetLoss: number;
    fontStyle: React.CSSProperties;
}

/**
 * Network stats popover rendered via React portal to escape
 * overflow:hidden containers (SidebarPanel). Dynamically positioned
 * above the anchor element, clamped to viewport bounds.
 */
export const VoiceDetailsPortal = ({
    show,
    anchorRef,
    onClose,
    voiceDetailsTab,
    setVoiceDetailsTab,
    averagePing,
    ping,
    packetLoss,
    fontStyle,
}: VoiceDetailsPortalProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    const reposition = useCallback(() => {
        if (!anchorRef.current || !panelRef.current) return;
        const _anchor = anchorRef.current.getBoundingClientRect();
        const _panel = panelRef.current.getBoundingClientRect();
        const _margin = 10;

        let top = _anchor.top - _panel.height - _margin;
        let left = _anchor.left;

        // Clamp to viewport
        if (top < _margin) top = _anchor.bottom + _margin;
        if (left + _panel.width > window.innerWidth - _margin) {
            left = window.innerWidth - _panel.width - _margin;
        }
        if (left < _margin) left = _margin;

        setPos({ top, left });
    }, [anchorRef]);

    useEffect(() => {
        if (!show) { setPos(null); return; }
        requestAnimationFrame(reposition);
        window.addEventListener('resize', reposition);
        return () => window.removeEventListener('resize', reposition);
    }, [show, reposition]);

    // Close on outside click
    useEffect(() => {
        if (!show) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current?.contains(e.target as Node)) return;
            if (anchorRef.current?.contains(e.target as Node)) return;
            onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [show, onClose, anchorRef]);

    if (!show) return null;

    return createPortal(
        <div
            ref={(node) => {
                (panelRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                if (node && !pos) requestAnimationFrame(reposition);
            }}
            className="fixed z-[9999] w-[340px] rounded-xl shadow-[0_10px_40px_rgba(34,211,238,0.2)] border border-cyan-500/30 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                background: 'rgba(5,5,17,0.92)',
                backdropFilter: 'blur(24px)',
            }}
        >
            <div className="p-4 pt-5 pb-3">
                <h3 className="text-cyan-50 font-bold uppercase tracking-widest text-[16px] mb-4">
                    Voice System Matrix
                </h3>

                {/* Tabs */}
                <div className="flex border-b border-cyan-500/20 mb-4 pb-2">
                    <TabButton
                        active={voiceDetailsTab === 'connexion'}
                        onClick={() => setVoiceDetailsTab('connexion')}
                        label="Connexion"
                    />
                    <TabButton
                        active={voiceDetailsTab === 'confidentialité'}
                        onClick={() => setVoiceDetailsTab('confidentialité')}
                        label="Confidentialité"
                    />
                </div>

                {voiceDetailsTab === 'connexion' ? (
                    <div className="text-[14px] text-cyan-100/70" style={fontStyle}>
                        <StatRow label="Latence moyenne" value={`${averagePing} ms`} />
                        <StatRow label="Dernière latence" value={`${ping} ms`} />
                        <StatRow label="Perte de paquets" value={`${packetLoss.toFixed(1)} %`} last />
                    </div>
                ) : (
                    <div className="text-[14px] text-cyan-100/70 leading-relaxed" style={fontStyle}>
                        La transmission vocale et vidéo n'est pas complètement chiffrée de bout en bout pour le moment
                        sur Void. Notre protocole de signalisation est sécurisé, mais l'architecture serveur (SFU)
                        nécessite de déchiffrer les flux média (DTLS/SRTP) en mémoire pour les redistribuer.
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 rounded-b-xl flex items-center justify-between border-t border-cyan-500/20" style={{ background: 'rgba(5,5,17,0.6)' }}>
                <div className="flex items-center text-cyan-400 text-[12px] font-semibold">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Chiffré de bout en bout
                </div>
                <a href="#" className="text-blue-400 hover:text-cyan-300 hover:underline text-[12px] font-medium transition-colors">
                    En savoir plus
                </a>
            </div>
        </div>,
        document.body,
    );
};

/** Single tab button inside the details header. */
const TabButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button
        onClick={onClick}
        className={`pb-2 px-1 mr-4 text-[14px] font-medium transition-colors relative ${active ? 'text-cyan-400' : 'text-gray-500 hover:text-cyan-100'}`}
    >
        {label}
        {active && (
            <div className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
        )}
    </button>
);

/** Single stat row in the connexion tab. */
const StatRow = ({ label, value, last = false }: { label: string; value: string; last?: boolean }) => (
    <div className={last ? 'mb-4' : 'mb-1'}>
        <span className="font-semibold text-cyan-500/80 uppercase text-[10px] tracking-wider">{label} : </span>
        <span className="font-bold text-cyan-300">{value}</span>
    </div>
);

