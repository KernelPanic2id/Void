import { createContext, ReactNode, useContext, useEffect, useRef } from 'react';
import { useVoiceStore } from './VoiceContext';
import { useServer } from './ServerContext';
import ChatContextValue from '../models/chat/chatContextValue.model';

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/**
 * Thin chat context that forwards socket messages from VoiceContext.
 * Clears message history automatically when the active server changes.
 */
export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const { chatMessages, sendChatMessage, clearChatMessages } = useVoiceStore();
    const { activeServerId } = useServer();
    const _prevServerRef = useRef<string | null>(activeServerId);

    // Flush messages when the active server changes
    useEffect(() => {
        if (_prevServerRef.current !== activeServerId) {
            clearChatMessages();
            _prevServerRef.current = activeServerId;
        }
    }, [activeServerId, clearChatMessages]);

    // One-time cleanup of legacy localStorage key
    useEffect(() => {
        localStorage.removeItem('chat_history_main');
    }, []);

    return (
        <ChatContext.Provider value={{ chatMessages, sendChatMessage, clearHistory: clearChatMessages }}>
            {children}
        </ChatContext.Provider>
    );
};

/**
 * @throws {Error} Throws if invoked outside of a valid ChatProvider subtree.
 * @returns {ChatContextValue} Chat state and dispatch functions.
 */
export const useChatStore = () => {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatStore must be used within ChatProvider');
    return context;
};
