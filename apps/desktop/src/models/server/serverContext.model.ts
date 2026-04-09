import { Server, ServerChannel } from './server.model';

export default interface ServerContextProps {
  servers: Server[];
  activeServerId: string | null;
  loading: boolean;
  setActiveServerId: (id: string | null) => void;
  createServer: (name: string) => Promise<void>;
  deleteServer: (serverId: string) => Promise<void>;
  joinServer: (inviteKey: string) => Promise<void>;
  createChannel: (serverId: string, channel: Omit<ServerChannel, 'id'>) => Promise<void>;
  deleteChannel: (serverId: string, channelId: string) => Promise<void>;
  fetchServers: () => Promise<void>;
  isOwner: (serverId: string) => boolean;
}

