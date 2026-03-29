import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../context/ChatContext';
import { useVoiceStore } from '../../context/VoiceContext';
import { Send } from 'lucide-react';

export const ChatPanel = () => {
    const { chatMessages, sendChatMessage } = useChatStore();
    const { localUserId, channelId } = useVoiceStore();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll automatique
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = input.trim();
        if (trimmedInput && channelId) {
            sendChatMessage(trimmedInput);
            setInput('');
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col bg-[#313338] text-[#dbdee1]">
            <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50">
                        <div className="text-4xl mb-4">💬</div>
                        <h2 className="text-xl font-bold text-white mb-2">Bienvenue dans #chat-general !</h2>
                        <p className="text-sm">C'est le début de l'histoire de ce salon.</p>
                    </div>
                ) : (
                    chatMessages.map((msg, index) => {
                        const prevMsg = chatMessages[index - 1];
                        const isSameUser = prevMsg && prevMsg.from === msg.from && (msg.timestamp - prevMsg.timestamp < 300000);

                        return (
                            <div key={`${msg.id}-${msg.timestamp}`} className={`flex flex-col group hover:bg-[#2e3035] -mx-4 px-4 ${isSameUser ? 'py-0.5' : 'mt-4 py-1'}`}>
                                {!isSameUser && (
                                    <div className="flex items-baseline gap-2 mb-0.5">
                                        <span className={`font-bold ${msg.from === localUserId ? 'text-[#23a55a]' : 'text-white'} hover:underline cursor-pointer`}>
                                            {msg.username}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-medium">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                                <div className="text-[15px] break-words whitespace-pre-wrap leading-relaxed text-[#dbdee1]">
                                    {msg.message}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="px-4 pb-6 pt-2 bg-[#313338]">
                <form onSubmit={handleSend} className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={!channelId}
                        placeholder={channelId ? "Envoyer un message dans #chat-general" : "Connectez-vous à un salon vocal pour discuter"}
                        className="w-full bg-[#383a40] text-[15px] text-[#dbdee1] rounded-[8px] px-4 py-2.5 focus:outline-none focus:ring-0 placeholder:text-[#949ba4] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button 
                        type="submit"
                        className="absolute right-3 p-1 text-[#b5bac1] hover:text-[#dbdee1] disabled:opacity-30 transition-colors"
                        disabled={!input.trim() || !channelId}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};
