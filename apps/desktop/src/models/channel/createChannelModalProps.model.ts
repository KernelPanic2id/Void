import { ServerChannel } from '../server/server.model';

export default interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (channel: Omit<ServerChannel, 'id'>) => void;
}

