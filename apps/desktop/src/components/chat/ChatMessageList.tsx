import { Send } from 'lucide-react';
import ChatMessage from '../../models/chat/chatMessage.model';

const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Renders the chat message list with grouped headers.
 * Displayed inside ChatPanel's scrollable area.
 */
export const ChatMessageList = ({
    messages,
    localUserId,
    voiceAvatar,
}: {
    messages: ChatMessage[];
    localUserId: string;
    voiceAvatar: string | null;
}) => {
    if (messages.length === 0) return <EmptyChat />;

    return (
        <>
            {messages.map((message, i) => {
                const showHeader =
                    i === 0 ||
                    messages[i - 1].from !== message.from ||
                    message.timestamp - messages[i - 1].timestamp > 5 * 60 * 1000;

                const isLocalUser = message.from === localUserId;

                return (
                    <div key={message.id} className={`group flex gap-4 ${showHeader ? 'mt-5' : 'mt-1'}`}>
                        {showHeader ? (
                            <div className="relative shrink-0 w-10 h-10">
                                {(isLocalUser && voiceAvatar) ? (
                                    <img
                                        src={voiceAvatar}
                                        alt={message.username}
                                        className="w-10 h-10 rounded-xl object-cover border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)] group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-cyan-900 to-[#0a0b14] flex items-center justify-center text-cyan-200 text-lg font-black border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)] group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300">
                                        {message.username.slice(0, 1).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-10 shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                            {showHeader && (
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className={`font-bold tracking-wide truncate ${isLocalUser ? 'text-cyan-300' : 'text-cyan-100 hover:underline cursor-pointer'}`}>
                                        {message.username}
                                    </span>
                                    <span className="text-[10px] text-cyan-500/50 font-mono">
                                        {formatTime(message.timestamp)}
                                    </span>
                                </div>
                            )}
                            <div className="text-cyan-50/90 text-[14px] leading-relaxed wrap-break-word">
                                {message.message}
                            </div>
                        </div>
                    </div>
                );
            })}
        </>
    );
};

/** Shown when no messages exist yet. */
const EmptyChat = () => (
    <div className="flex flex-col items-center justify-center h-full text-cyan-500/50 space-y-4 my-10 animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-2xl bg-cyan-900/20 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
            <Send className="w-8 h-8 text-cyan-500/50" />
        </div>
        <div className="text-center">
            <h3 className="font-bold text-cyan-100 text-lg tracking-wide">Bienvenue dans le chat</h3>
            <p className="text-sm mt-1">C'est le début de l'historique de ce salon.</p>
        </div>
    </div>
);





