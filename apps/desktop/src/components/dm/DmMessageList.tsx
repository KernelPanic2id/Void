import { useEffect, useRef } from 'react';
import { DmMessage } from '../../models/social/dmMessage.model';

export interface DmMessageListProps {
    messages: DmMessage[];
    selfUserId: string | null;
}

/** Oldest-first list of DM messages with auto-scroll on new entries. */
export const DmMessageList = ({ messages, selfUserId }: DmMessageListProps) => {
    const _endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        _endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages.length]);

    if (messages.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-cyan-500/40 text-[12px]">
                No messages yet — say hi 👋
            </div>
        );
    }

    return (
        <div className="space-y-2 px-1">
            {messages.map((m) => {
                const _mine = m.fromUserId === selfUserId;
                return (
                    <div
                        key={m.id}
                        className={`flex ${_mine ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] leading-snug
                                ${_mine
                                    ? 'bg-cyan-500/20 border border-cyan-400/30 text-cyan-100'
                                    : 'bg-white/5 border border-white/10 text-cyan-100/90'}
                                ${m.pending ? 'opacity-60' : ''}`}
                        >
                            <p className="whitespace-pre-wrap break-words">{m.message}</p>
                            <span className="block mt-1 text-[10px] text-cyan-400/40 font-mono">
                                {new Date(m.timestamp).toLocaleTimeString()}
                                {m.pending ? ' • sending…' : ''}
                            </span>
                        </div>
                    </div>
                );
            })}
            <div ref={_endRef} />
        </div>
    );
};

export default DmMessageList;

