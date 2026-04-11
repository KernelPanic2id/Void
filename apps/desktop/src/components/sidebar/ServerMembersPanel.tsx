import { Users, Crown, Loader2 } from 'lucide-react';
import ServerMembersPanelProps from '../../models/server/serverMembersPanelProps.model';
import { identityTag } from '../../lib/identity-tag';

/**
 * Displays the list of all members belonging to a server.
 * Owner is highlighted with a crown badge.
 */
export const ServerMembersPanel = ({ members, loading }: ServerMembersPanelProps) => {
    if (loading && members.length === 0) {
        return (
            <div className="flex items-center justify-center py-6 gap-2 text-cyan-400/60 text-xs">
                <Loader2 size={14} className="animate-spin" />
                <span>Chargement…</span>
            </div>
        );
    }

    if (members.length === 0) return null;

    const owner = members.filter(m => m.isOwner);
    const others = members.filter(m => !m.isOwner);

    return (
        <div className="flex flex-col gap-1">
            {owner.length > 0 && (
                <MemberGroup label="Propriétaire" count={owner.length}>
                    {owner.map(m => <MemberRow key={m.publicKey} {...m} />)}
                </MemberGroup>
            )}
            {others.length > 0 && (
                <MemberGroup label="Membres" count={others.length}>
                    {others.map(m => <MemberRow key={m.publicKey} {...m} />)}
                </MemberGroup>
            )}
        </div>
    );
};

/** Category header for a member group. */
const MemberGroup = ({ label, count, children }: { label: string; count: number; children: React.ReactNode }) => (
    <div className="mb-1">
        <div className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-black text-cyan-500/60 uppercase tracking-[0.15em]">
            <Users size={10} />
            {label} — {count}
        </div>
        <div className="flex flex-col gap-0.5 px-2">{children}</div>
    </div>
);

/** Single member row with avatar, name, tag, and optional owner badge. */
const MemberRow = ({ publicKey, displayName, avatar, isOwner }: {
    publicKey: string;
    displayName: string;
    avatar: string | null;
    isOwner: boolean;
}) => {
    const _tag = identityTag(publicKey);

    return (
        <div className="group/member flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-all duration-200 cursor-default border border-transparent hover:border-cyan-500/20">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                {avatar ? (
                    <img
                        src={avatar}
                        alt={displayName}
                        className="w-7 h-7 rounded-full object-cover border border-cyan-500/30"
                    />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-[#050511] flex items-center justify-center text-cyan-200 text-[11px] font-black border border-cyan-500/30">
                        {displayName.slice(0, 1).toUpperCase()}
                    </div>
                )}
                {isOwner && (
                    <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-[#050511]">
                        <Crown size={7} className="text-white" />
                    </div>
                )}
            </div>

            {/* Name + tag */}
            <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[12px] font-bold text-cyan-100/80 truncate group-hover/member:text-cyan-200 transition-colors">
                    {displayName}
                </span>
                <span className="text-[10px] text-cyan-500/40 font-mono">
                    #{_tag}
                </span>
            </div>
        </div>
    );
};

