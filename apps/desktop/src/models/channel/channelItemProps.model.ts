import { ServerChannel } from '../server/server.model';

export default interface ChannelItemProps {
  channel: ServerChannel;
  isActive: boolean;
  onSelect: (channelId: string) => void;
}

