import { Server, ServerChannel } from '../server/server.model';
import VoicePeer from '../voice/voicePeer.model';

export default interface ChannelListProps {
    server: Server;
    activeChannelId: string | null;
    onSelectChannel: (channelId: string) => void;
    onCreateChannel: (channel: Omit<ServerChannel, 'id'>) => void;
    onDeleteChannel?: (channelId: string) => void;
    onDeleteServer?: () => void;
    onJoinVoice?: (channelId: string) => void;
    isOwner?: boolean;
    participants?: VoicePeer[];
    speakingUsers?: Map<string, boolean>;
    voiceChannelId?: string | null;
}

