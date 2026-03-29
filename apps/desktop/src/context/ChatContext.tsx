import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react';
import { useVoiceStore, ChatMessage } from './VoiceContext';

interface ChatContextType {
    chatMessages: ChatMessage[];
    sendChatMessage: (message: string) => void;
    clearHistory: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = 'chat_history_main';

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const { chatMessages: socketMessages, sendChatMessage: sendViaSocket, isConnected } = useVoiceStore();
    const [persistedMessages, setPersistedMessages] = useState<ChatMessage[]>([]);

    // Charger l'historique au montage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setPersistedMessages(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse chat history", e);
            }
        }
    }, []);

    // Observer les messages arrivant via le socket dans VoiceContext
    useEffect(() => {
        if (socketMessages.length === 0) return;

        setPersistedMessages(prev => {
            // On prend tous les messages qu'on n'a pas encore dans notre état local
            const newMessages = socketMessages.filter(sm => !prev.some(pm => pm.id === sm.id));
            if (newMessages.length === 0) return prev;

            const combined = [...prev, ...newMessages];
            const sliced = combined.slice(-200); // Garder les 200 derniers
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sliced));
            return sliced;
        });
    }, [socketMessages]);

    const sendChatMessage = useCallback((message: string) => {
        if (!message.trim() || !isConnected) return;
        sendViaSocket(message);
    }, [sendViaSocket, isConnected]);

    const clearHistory = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setPersistedMessages([]);
    }, []);

    return (
        <ChatContext.Provider value={{ chatMessages: persistedMessages, sendChatMessage, clearHistory }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChatStore = () => {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatStore must be used within ChatProvider');
    return context;
};
