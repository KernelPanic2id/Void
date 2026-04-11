import ChatMessage from './chatMessage.model';

export default interface ChatContextValue {
    chatMessages: ChatMessage[];
    sendChatMessage: (message: string) => void;
    clearHistory: () => void;
    loadHistory: (serverId: string, channelId: string) => Promise<void>;
    activeChannelId: string | null;
    setActiveChannelId: (channelId: string | null) => void;
}
